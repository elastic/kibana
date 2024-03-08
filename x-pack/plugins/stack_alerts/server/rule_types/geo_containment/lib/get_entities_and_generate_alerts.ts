/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import type {
  GeoContainmentAlertInstanceState,
  GeoContainmentAlertInstanceContext,
} from '../types';

import { ActionGroupId, OTHER_CATEGORY } from '../constants';
import { getAlertId, getContainedAlertContext } from './alert_context';

export function getEntitiesAndGenerateAlerts(
  prevLocationMap: Map<string, GeoContainmentAlertInstanceState[]>,
  currLocationMap: Map<string, GeoContainmentAlertInstanceState[]>,
  alertsClient: RuleExecutorServices<
    GeoContainmentAlertInstanceState,
    GeoContainmentAlertInstanceContext,
    typeof ActionGroupId
  >['alertsClient'],
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
        alertsClient!.report({
          id: getAlertId(entityName, context.containingBoundaryName),
          actionGroup: ActionGroupId,
          context,
        });
      }
    });

    // Entity in "other" filter bucket is no longer contained by any boundary and switches from "active" to "inactive"
    if (containments[0].shapeLocationId === OTHER_CATEGORY) {
      inactiveEntities.set(entityName, containments);
      activeEntities.delete(entityName);
      return;
    }

    // TODO remove otherCatIndex check
    // Elasticsearch filters aggregation is used to group results into buckets matching entity locations intersecting boundary shapes
    // filters.other_bucket_key returns bucket with entities that did not intersect any boundary shape.
    // shapeLocationId === OTHER_CATEGORY can only occur when containments.length === 1
    // test data does not follow this pattern and needs to be updated.
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
