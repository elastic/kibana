/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { executeEsQueryFactory, OTHER_CATEGORY } from './es_query_builder';
import { canSkipBoundariesFetch, getShapeFilters } from './get_shape_filters';
import type {
  GeoContainmentAlertInstanceState,
  GeoContainmentAlertType,
  GeoContainmentAlertInstanceContext,
  GeoContainmentRuleState,
} from './types';

import { ActionGroupId, GEO_CONTAINMENT_ID } from './constants';
import { getAlertId, getContainedAlertContext, getRecoveredAlertContext } from './get_context';

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: estypes.SearchResponse<unknown> | undefined,
  dateField: string,
  geoField: string
): Map<string, GeoContainmentAlertInstanceState[]> {
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
        accu: Map<string, GeoContainmentAlertInstanceState[]>,
        el: GeoContainmentAlertInstanceState & { entityName: string }
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

export function getEntitiesAndGenerateAlerts(
  prevLocationMap: Map<string, GeoContainmentAlertInstanceState[]>,
  currLocationMap: Map<string, GeoContainmentAlertInstanceState[]>,
  alertFactory: RuleExecutorServices<
    GeoContainmentAlertInstanceState,
    GeoContainmentAlertInstanceContext,
    typeof ActionGroupId
  >['alertFactory'],
  shapesIdsNamesMap: Record<string, unknown>,
  windowEnd: Date
): {
  activeEntities: Map<string, GeoContainmentAlertInstanceState[]>;
  inactiveEntities: Map<string, GeoContainmentAlertInstanceState[]>;
} {
  const activeEntities: Map<string, GeoContainmentAlertInstanceState[]> = new Map([
    ...prevLocationMap,
    ...currLocationMap,
  ]);
  const inactiveEntities: Map<string, GeoContainmentAlertInstanceState[]> = new Map();
  activeEntities.forEach((containments, entityName) => {
    // Generate alerts
    containments.forEach((containment) => {
      if (containment.shapeLocationId !== OTHER_CATEGORY) {
        const context = getContainedAlertContext({
          entityName,
          containment,
          shapesIdsNamesMap,
          windowEnd,
        });
        alertFactory
          .create(getAlertId(entityName, context.containingBoundaryName))
          .scheduleActions(ActionGroupId, context);
      }
    });

    // Entity in "other" filter bucket is no longer contained by any boundary and switches from "active" to "inactive"
    if (containments[0].shapeLocationId === OTHER_CATEGORY) {
      inactiveEntities.set(entityName, containments);
      activeEntities.delete(entityName);
      return;
    }

    const otherCatIndex = containments.findIndex(
      ({ shapeLocationId }) => shapeLocationId === OTHER_CATEGORY
    );
    if (otherCatIndex >= 0) {
      const afterOtherLocationsArr = containments.slice(0, otherCatIndex);
      activeEntities.set(entityName, afterOtherLocationsArr);
    } else {
      activeEntities.set(entityName, containments);
    }
  });
  return { activeEntities, inactiveEntities };
}

export const getGeoContainmentExecutor = (): GeoContainmentAlertType['executor'] =>
  async function ({
    previousStartedAt: windowStart,
    startedAt: windowEnd,
    services,
    params,
    rule: { id: ruleId },
    state,
    logger,
  }): Promise<{ state: GeoContainmentRuleState }> {
    const boundariesRequestMeta = {
      geoField: params.geoField,
      boundaryIndexTitle: params.boundaryIndexTitle,
      boundaryGeoField: params.boundaryGeoField,
      boundaryNameField: params.boundaryNameField,
      boundaryIndexQuery: params.boundaryIndexQuery,
    };
    const { shapesFilters, shapesIdsNamesMap } = state.shapesFilters && canSkipBoundariesFetch(boundariesRequestMeta, state.boundariesRequestMeta)
      ? state
      : await getShapeFilters(boundariesRequestMeta, services.scopedClusterClient.asCurrentUser);

    const executeEsQuery = await executeEsQueryFactory(
      params,
      services.scopedClusterClient.asCurrentUser,
      shapesFilters
    );

    // Start collecting data only on the first cycle
    let currentIntervalResults: estypes.SearchResponse<unknown> | undefined;
    if (!windowStart) {
      logger.debug(`alert ${GEO_CONTAINMENT_ID}:${ruleId} alert initialized. Collecting data`);
      // Consider making first time window configurable?
      const START_TIME_WINDOW = 1;
      const tempPreviousEndTime = new Date(windowEnd);
      tempPreviousEndTime.setMinutes(tempPreviousEndTime.getMinutes() - START_TIME_WINDOW);
      currentIntervalResults = await executeEsQuery(tempPreviousEndTime, windowEnd);
    } else {
      currentIntervalResults = await executeEsQuery(windowStart, windowEnd);
    }

    const currLocationMap: Map<string, GeoContainmentAlertInstanceState[]> = transformResults(
      currentIntervalResults,
      params.dateField,
      params.geoField
    );

    const prevLocationMap: Map<string, GeoContainmentAlertInstanceState[]> = new Map([
      ...Object.entries(
        (state.prevLocationMap as Record<string, GeoContainmentAlertInstanceState[]>) || {}
      ),
    ]);
    const { activeEntities, inactiveEntities } = getEntitiesAndGenerateAlerts(
      prevLocationMap,
      currLocationMap,
      services.alertFactory,
      shapesIdsNamesMap,
      windowEnd
    );

    const { getRecoveredAlerts } = services.alertFactory.done();
    for (const recoveredAlert of getRecoveredAlerts()) {
      const recoveredAlertId = recoveredAlert.getId();
      try {
        const context = getRecoveredAlertContext({
          alertId: recoveredAlertId,
          activeEntities,
          inactiveEntities,
          windowEnd,
        });
        if (context) {
          recoveredAlert.setContext(context);
        }
      } catch (e) {
        logger.warn(`Unable to set alert context for recovered alert, error: ${e.message}`);
      }
    }

    return {
      state: {
        boundariesRequestMeta,
        shapesFilters,
        shapesIdsNamesMap,
        prevLocationMap: Object.fromEntries(activeEntities),
      },
    };
  };
