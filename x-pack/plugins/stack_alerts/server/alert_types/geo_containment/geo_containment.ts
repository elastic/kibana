/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { executeEsQueryFactory, getShapesFilters, OTHER_CATEGORY } from './es_query_builder';
import {
  ActionGroupId,
  GeoContainmentInstanceState,
  GeoContainmentAlertType,
  GeoContainmentInstanceContext,
  GeoContainmentState,
} from './alert_type';

import { GEO_CONTAINMENT_ID } from './alert_type';

export type LatestEntityLocation = GeoContainmentInstanceState;

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: estypes.SearchResponse<unknown> | undefined,
  dateField: string,
  geoField: string
): Map<string, LatestEntityLocation[]> {
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
        accu: Map<string, LatestEntityLocation[]>,
        el: LatestEntityLocation & { entityName: string }
      ) => {
        const { entityName, ...locationData } = el;
        if (entityName) {
          if (!accu.has(entityName)) {
            accu.set(entityName, []);
          }
          accu.get(entityName)!.push(locationData);
        }
        return accu;
      },
      new Map()
    );
  return orderedResults;
}

export function getActiveEntriesAndGenerateAlerts(
  prevLocationMap: Map<string, LatestEntityLocation[]>,
  currLocationMap: Map<string, LatestEntityLocation[]>,
  alertFactory: RuleExecutorServices<
    GeoContainmentInstanceState,
    GeoContainmentInstanceContext,
    typeof ActionGroupId
  >['alertFactory'],
  shapesIdsNamesMap: Record<string, unknown>,
  currIntervalEndTime: Date
) {
  const allActiveEntriesMap: Map<string, LatestEntityLocation[]> = new Map([
    ...prevLocationMap,
    ...currLocationMap,
  ]);
  allActiveEntriesMap.forEach((locationsArr, entityName) => {
    // Generate alerts
    locationsArr.forEach(({ location, shapeLocationId, dateInShape, docId }) => {
      const context = {
        entityId: entityName,
        entityDateTime: dateInShape || null,
        entityDocumentId: docId,
        detectionDateTime: new Date(currIntervalEndTime).toISOString(),
        entityLocation: `POINT (${location[0]} ${location[1]})`,
        containingBoundaryId: shapeLocationId,
        containingBoundaryName: shapesIdsNamesMap[shapeLocationId] || shapeLocationId,
      };
      const alertInstanceId = `${entityName}-${context.containingBoundaryName}`;
      if (shapeLocationId !== OTHER_CATEGORY) {
        alertFactory.create(alertInstanceId).scheduleActions(ActionGroupId, context);
      }
    });

    if (locationsArr[0].shapeLocationId === OTHER_CATEGORY) {
      allActiveEntriesMap.delete(entityName);
      return;
    }

    const otherCatIndex = locationsArr.findIndex(
      ({ shapeLocationId }) => shapeLocationId === OTHER_CATEGORY
    );
    if (otherCatIndex >= 0) {
      const afterOtherLocationsArr = locationsArr.slice(0, otherCatIndex);
      allActiveEntriesMap.set(entityName, afterOtherLocationsArr);
    } else {
      allActiveEntriesMap.set(entityName, locationsArr);
    }
  });
  return allActiveEntriesMap;
}

export const getGeoContainmentExecutor = (log: Logger): GeoContainmentAlertType['executor'] =>
  async function ({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
    services,
    params,
    alertId,
    state,
  }): Promise<GeoContainmentState> {
    const { shapesFilters, shapesIdsNamesMap } = state.shapesFilters
      ? state
      : await getShapesFilters(
          params.boundaryIndexTitle,
          params.boundaryGeoField,
          params.geoField,
          services.scopedClusterClient.asCurrentUser,
          log,
          alertId,
          params.boundaryNameField,
          params.boundaryIndexQuery
        );

    const executeEsQuery = await executeEsQueryFactory(
      params,
      services.scopedClusterClient.asCurrentUser,
      log,
      shapesFilters
    );

    // Start collecting data only on the first cycle
    let currentIntervalResults: estypes.SearchResponse<unknown> | undefined;
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

    const currLocationMap: Map<string, LatestEntityLocation[]> = transformResults(
      currentIntervalResults,
      params.dateField,
      params.geoField
    );

    const prevLocationMap: Map<string, LatestEntityLocation[]> = new Map([
      ...Object.entries((state.prevLocationMap as Record<string, LatestEntityLocation[]>) || {}),
    ]);
    const allActiveEntriesMap = getActiveEntriesAndGenerateAlerts(
      prevLocationMap,
      currLocationMap,
      services.alertFactory,
      shapesIdsNamesMap,
      currIntervalEndTime
    );

    return {
      shapesFilters,
      shapesIdsNamesMap,
      prevLocationMap: Object.fromEntries(allActiveEntriesMap),
    };
  };
