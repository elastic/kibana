/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { Logger } from 'src/core/server';
import { executeEsQueryFactory, getShapesFilters, OTHER_CATEGORY } from './es_query_builder';
import { AlertServices, AlertTypeState } from '../../../../alerts/server';
import { ActionGroupId, GEO_CONTAINMENT_ID, GeoContainmentParams } from './alert_type';
import { ResolvedActionGroup } from '../../../../alerts/common';

interface LatestEntityLocation {
  location: number[];
  shapeLocationId: string;
  entityName: string;
  dateInShape: string | null;
  docId: string;
}

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: SearchResponse<unknown> | undefined,
  dateField: string,
  geoField: string
): Map<string, EntityLocation> {
  if (!results) {
    return [];
  }

  return (
    _.chain(results)
      .get('aggregations.shapes.buckets', {})
      // @ts-expect-error
      .flatMap((bucket: unknown, bucketKey: string) => {
        const subBuckets = _.get(bucket, 'entitySplit.buckets', []);
        return _.map(subBuckets, (subBucket) => {
          const locationFieldResult = _.get(
            subBucket,
            `entityHits.hits.hits[0].fields["${geoField}"][0]`,
            ''
          );
          const location = locationFieldResult
            ? _.chain(locationFieldResult)
                .split(', ')
                .map((coordString) => +coordString)
                .reverse()
                .value()
            : null;
          const dateInShape = _.get(
            subBucket,
            `entityHits.hits.hits[0].fields["${dateField}"][0]`,
            null
          );
          const docId = _.get(subBucket, `entityHits.hits.hits[0]._id`);

          return {
            location,
            shapeLocationId: bucketKey,
            entityName: subBucket.key,
            dateInShape,
            docId,
          };
        });
      })
      .orderBy(['entityName', 'dateInShape'], ['asc', 'desc'])
      .reduce((accu: Map<string, EntityLocation>, el: LatestEntityLocation) => {
        const { entityName, ...locationData } = el;
        if (!accu.size || entityName !== Array.from(accu)[accu.size - 1].entityName) {
          accu.set(entityName, locationData);
        }
        return accu;
      }, new Map())
      .value()
  );
}

function getOffsetTime(delayOffsetWithUnits: string, oldTime: Date): Date {
  const timeUnit = delayOffsetWithUnits.slice(-1);
  const time: number = +delayOffsetWithUnits.slice(0, -1);

  const adjustedDate = new Date(oldTime.getTime());
  if (timeUnit === 's') {
    adjustedDate.setSeconds(adjustedDate.getSeconds() - time);
  } else if (timeUnit === 'm') {
    adjustedDate.setMinutes(adjustedDate.getMinutes() - time);
  } else if (timeUnit === 'h') {
    adjustedDate.setHours(adjustedDate.getHours() - time);
  } else if (timeUnit === 'd') {
    adjustedDate.setDate(adjustedDate.getDate() - time);
  }
  return adjustedDate;
}

export const getGeoContainmentExecutor = (log: Logger) =>
  async function ({
    previousStartedAt,
    startedAt,
    services,
    params,
    alertId,
    state,
  }: {
    previousStartedAt: Date | null;
    startedAt: Date;
    services: AlertServices;
    params: GeoContainmentParams;
    alertId: string;
    state: AlertTypeState;
  }): Promise<AlertTypeState> {
    const { shapesFilters, shapesIdsNamesMap } = state.shapesFilters
      ? state
      : await getShapesFilters(
          params.boundaryIndexTitle,
          params.boundaryGeoField,
          params.geoField,
          services.callCluster,
          log,
          alertId,
          params.boundaryNameField,
          params.boundaryIndexQuery
        );

    const executeEsQuery = await executeEsQueryFactory(params, services, log, shapesFilters);

    let currIntervalStartTime = previousStartedAt;
    let currIntervalEndTime = startedAt;
    if (params.delayOffsetWithUnits) {
      if (currIntervalStartTime) {
        currIntervalStartTime = getOffsetTime(params.delayOffsetWithUnits, currIntervalStartTime);
      }
      currIntervalEndTime = getOffsetTime(params.delayOffsetWithUnits, currIntervalEndTime);
    }

    // Start collecting data only on the first cycle
    if (!currIntervalStartTime) {
      log.debug(`alert ${GEO_CONTAINMENT_ID}:${alertId} alert initialized. Collecting data`);
      // Consider making first time window configurable?
      const tempPreviousEndTime = new Date(currIntervalEndTime);
      tempPreviousEndTime.setMinutes(tempPreviousEndTime.getMinutes() - 5);
      const prevToCurrentIntervalResults:
        | SearchResponse<unknown>
        | undefined = await executeEsQuery(tempPreviousEndTime, currIntervalEndTime);
      return {
        prevLocationArr: transformResults(
          prevToCurrentIntervalResults,
          params.dateField,
          params.geoField
        ),
        shapesFilters,
        shapesIdsNamesMap,
      };
    }

    const currentIntervalResults: SearchResponse<unknown> | undefined = await executeEsQuery(
      currIntervalStartTime,
      currIntervalEndTime
    );
    // No need to compare if no changes in current interval
    if (!_.get(currentIntervalResults, 'hits.total.value')) {
      return state;
    }

    const currLocationMap: Map<string, EntityLocation> = transformResults(
      currentIntervalResults,
      params.dateField,
      params.geoField
    );

    // Cycle through instances that received no updates and keep active
    const activeAlertsList = state.activeAlertsList || {};
    _.forEach(activeAlertsList, (val, key) => {
      if (!currLocationMap.has(key)) {
        const containingBoundaryName =
          shapesIdsNamesMap[val.containingBoundaryId] || val.containingBoundaryId;
        const alertInstanceId = `${val.entityName}-${containingBoundaryName}`;
        services.alertInstanceFactory(alertInstanceId).scheduleActions(ActionGroupId, val);
      }
    });

    // Cycle through new alert statuses and set active
    currLocationMap.forEach(({ location, shapeLocationId, dateInShape, docId }, entityName) => {
      const containingBoundaryName = shapesIdsNamesMap[shapeLocationId] || shapeLocationId;
      const context = {
        entityId: entityName,
        entityDateTime: new Date(dateInShape),
        entityDocumentId: docId,
        detectionDateTime: new Date(currIntervalEndTime),
        entityLocation: `POINT (${location[0]} ${location[1]})`,
        containingBoundaryId: shapeLocationId,
        containingBoundaryName,
      };
      const alertInstanceId = `${entityName}-${containingBoundaryName}`;
      if (shapeLocationId !== OTHER_CATEGORY) {
        activeAlertsList[entityName] = context;
        services
          .alertInstanceFactory(alertInstanceId)
          .scheduleActions(ResolvedActionGroup.id, context);
      } else {
        delete activeAlertsList[entityName];
      }
    });

    return {
      activeAlertsList,
      shapesFilters,
      shapesIdsNamesMap,
    };
  };
