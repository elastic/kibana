/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoContainmentInstanceContext, GeoContainmentInstanceState } from './alert_type';

function getAlertId(entityName: string, boundaryName: unknown) {
  return `${entityName}-${boundaryName}`;
}

function splitAlertId(alertId: string): { entityName: string, boundaryName: string } {
  const split = alertId.split('-');
  
  // entityName and boundaryName values are "user provided data" from elasticsearch
  // Values may contain '-', breaking alertId parsing
  // In these cases, recovered alert context cannot be obtained
  if (split.length !== 2) {
    throw new Error(`Can not split alertId '${alertId}' into entity name and boundary name. This can happen when entity name and boundary name contain '-' character.`);
  }

  return {
    entityName: split[0],
    boundaryName: split[1],
  };
}

function getBoundaryId(boundaryName: string, shapesIdsNamesMap: Record<string, unknown>): string {
  
}

export function getAlertContext(entityName: string, boundaryName: string, containmentState: GeoContainmentInstanceState): { context: GeoContainmentInstanceContext, alertId: string } {
    const boundaryName = 
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
}

export function getRecoveredAlertContext(
  alertId: string,
  shapesIdsNamesMap: Record<string, unknown>,
  prevLocationMap: Map<string, GeoContainmentInstanceState[]>,
) GeoContainmentInstanceContext | null {
  const { entityName, boundaryName } = splitAlertId(alertId);
  // boundaryName can be boundaryName 
  boundaryId = 
}