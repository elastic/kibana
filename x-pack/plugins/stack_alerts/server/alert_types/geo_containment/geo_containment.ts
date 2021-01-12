/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { Logger } from 'src/core/server';
import { executeEsQueryFactory, getShapesFilters, OTHER_CATEGORY } from './es_query_builder';
import { AlertServices } from '../../../../alerts/server';
import {
  ActionGroupId,
  GEO_CONTAINMENT_ID,
  GeoContainmentInstanceState,
  GeoContainmentAlertType,
  GeoContainmentInstanceContext,
} from './alert_type';

export type LatestEntityLocation = GeoContainmentInstanceState;

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: SearchResponse<unknown> | undefined,
  dateField: string,
  geoField: string
): Map<string, LatestEntityLocation> {
  if (!results) {
    return new Map();
  }
  const buckets = _.get(results, 'aggregations.shapes.buckets', {});
  const arrResults = _.flatMap(buckets, (bucket: unknown, bucketKey: string) => {
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
        : [];
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
  });
  const orderedResults = _.orderBy(arrResults, ['entityName', 'dateInShape'], ['asc', 'desc'])
    // Get unique
    .reduce(
      (
        accu: Map<string, LatestEntityLocation>,
        el: LatestEntityLocation & { entityName: string }
      ) => {
        const { entityName, ...locationData } = el;
        if (!accu.has(entityName)) {
          accu.set(entityName, locationData);
        }
        return accu;
      },
      new Map()
    );
  return orderedResults;
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

export function getActiveEntriesAndGenerateAlerts(
  prevLocationMap: Record<string, LatestEntityLocation>,
  currLocationMap: Map<string, LatestEntityLocation>,
  alertInstanceFactory: AlertServices<
    GeoContainmentInstanceState,
    GeoContainmentInstanceContext,
    typeof ActionGroupId
  >['alertInstanceFactory'],
  shapesIdsNamesMap: Record<string, unknown>,
  currIntervalEndTime: Date
) {
  const allActiveEntriesMap: Map<string, LatestEntityLocation> = new Map([
    ...Object.entries(prevLocationMap || {}),
    ...currLocationMap,
  ]);
  allActiveEntriesMap.forEach(({ location, shapeLocationId, dateInShape, docId }, entityName) => {
    const containingBoundaryName = shapesIdsNamesMap[shapeLocationId] || shapeLocationId;
    const context = {
      entityId: entityName,
      entityDateTime: dateInShape ? new Date(dateInShape).toISOString() : null,
      entityDocumentId: docId,
      detectionDateTime: new Date(currIntervalEndTime).toISOString(),
      entityLocation: `POINT (${location[0]} ${location[1]})`,
      containingBoundaryId: shapeLocationId,
      containingBoundaryName,
    };
    const alertInstanceId = `${entityName}-${containingBoundaryName}`;
    if (shapeLocationId === OTHER_CATEGORY) {
      allActiveEntriesMap.delete(entityName);
    } else {
      alertInstanceFactory(alertInstanceId).scheduleActions(ActionGroupId, context);
    }
  });
  return allActiveEntriesMap;
}
export const getGeoContainmentExecutor = (log: Logger): GeoContainmentAlertType['executor'] =>
  async function ({ previousStartedAt, startedAt, services, params, alertId, state }) {
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
    let currentIntervalResults: SearchResponse<unknown> | undefined;
    if (!currIntervalStartTime) {
      log.debug(`alert ${GEO_CONTAINMENT_ID}:${alertId} alert initialized. Collecting data`);
      // Consider making first time window configurable?
      const START_TIME_WINDOW = 1;
      const tempPreviousEndTime = new Date(currIntervalEndTime);
      tempPreviousEndTime.setMinutes(tempPreviousEndTime.getMinutes() - START_TIME_WINDOW);
      currentIntervalResults = await executeEsQuery(tempPreviousEndTime, currIntervalEndTime);
    } else {
      currentIntervalResults = await executeEsQuery(currIntervalStartTime, currIntervalEndTime);
    }

    const currLocationMap: Map<string, LatestEntityLocation> = transformResults(
      currentIntervalResults,
      params.dateField,
      params.geoField
    );

    const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
      state.prevLocationMap as Record<string, LatestEntityLocation>,
      currLocationMap,
      services.alertInstanceFactory,
      shapesIdsNamesMap,
      currIntervalEndTime
    );

    return {
      shapesFilters,
      shapesIdsNamesMap,
      prevLocationMap: Object.fromEntries(allActiveEntriesMap),
    };
  };
