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
