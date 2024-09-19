/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { getGeoContainmentExecutor } from './geo_containment';
import {
  AlertType,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  AlertTypeParams,
} from '../../../../alerting/server';
import { Query } from '../../../../../../src/plugins/data/common/query';

export const GEO_CONTAINMENT_ID = '.geo-containment';
export const ActionGroupId = 'Tracked entity contained';
export const RecoveryActionGroupId = 'notGeoContained';

const actionVariableContextEntityIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextEntityIdLabel',
  {
    defaultMessage: 'The entity ID of the document that triggered the alert',
  }
);

const actionVariableContextEntityDateTimeLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityDateTimeLabel',
  {
    defaultMessage: `The date the entity was recorded in the boundary`,
  }
);

const actionVariableContextEntityDocumentIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityDocumentIdLabel',
  {
    defaultMessage: 'The id of the contained entity document',
  }
);

const actionVariableContextDetectionDateTimeLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextDetectionDateTimeLabel',
  {
    defaultMessage: 'The alert interval end time this change was recorded',
  }
);

const actionVariableContextEntityLocationLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityLocationLabel',
  {
    defaultMessage: 'The location of the entity',
  }
);

const actionVariableContextContainingBoundaryIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextContainingBoundaryIdLabel',
  {
    defaultMessage: 'The id of the boundary containing the entity',
  }
);

const actionVariableContextContainingBoundaryNameLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextContainingBoundaryNameLabel',
  {
    defaultMessage: 'The boundary the entity is currently located within',
  }
);

const actionVariables = {
  context: [
    // Alert-specific data
    { name: 'entityId', description: actionVariableContextEntityIdLabel },
    { name: 'entityDateTime', description: actionVariableContextEntityDateTimeLabel },
    { name: 'entityDocumentId', description: actionVariableContextEntityDocumentIdLabel },
    { name: 'detectionDateTime', description: actionVariableContextDetectionDateTimeLabel },
    { name: 'entityLocation', description: actionVariableContextEntityLocationLabel },
    { name: 'containingBoundaryId', description: actionVariableContextContainingBoundaryIdLabel },
    {
      name: 'containingBoundaryName',
      description: actionVariableContextContainingBoundaryNameLabel,
    },
  ],
};

export const ParamsSchema = schema.object({
  index: schema.string({ minLength: 1 }),
  indexId: schema.string({ minLength: 1 }),
  geoField: schema.string({ minLength: 1 }),
  entity: schema.string({ minLength: 1 }),
  dateField: schema.string({ minLength: 1 }),
  boundaryType: schema.string({ minLength: 1 }),
  boundaryIndexTitle: schema.string({ minLength: 1 }),
  boundaryIndexId: schema.string({ minLength: 1 }),
  boundaryGeoField: schema.string({ minLength: 1 }),
  boundaryNameField: schema.maybe(schema.string({ minLength: 1 })),
  indexQuery: schema.maybe(schema.any({})),
  boundaryIndexQuery: schema.maybe(schema.any({})),
});

export interface GeoContainmentParams extends AlertTypeParams {
  index: string;
  indexId: string;
  geoField: string;
  entity: string;
  dateField: string;
  boundaryType: string;
  boundaryIndexTitle: string;
  boundaryIndexId: string;
  boundaryGeoField: string;
  boundaryNameField?: string;
  indexQuery?: Query;
  boundaryIndexQuery?: Query;
}
export interface GeoContainmentState extends AlertTypeState {
  shapesFilters: Record<string, unknown>;
  shapesIdsNamesMap: Record<string, unknown>;
  prevLocationMap: Record<string, unknown>;
}
export interface GeoContainmentInstanceState extends AlertInstanceState {
  location: number[];
  shapeLocationId: string;
  dateInShape: string | null;
  docId: string;
}
export interface GeoContainmentInstanceContext extends AlertInstanceContext {
  entityId: string;
  entityDateTime: string | null;
  entityDocumentId: string;
  detectionDateTime: string;
  entityLocation: string;
  containingBoundaryId: string;
  containingBoundaryName: unknown;
}

export type GeoContainmentAlertType = AlertType<
  GeoContainmentParams,
  never, // Only use if defining useSavedObjectReferences hook
  GeoContainmentState,
  GeoContainmentInstanceState,
  GeoContainmentInstanceContext,
  typeof ActionGroupId,
  typeof RecoveryActionGroupId
>;

export function getAlertType(logger: Logger): GeoContainmentAlertType {
  const alertTypeName = i18n.translate('xpack.stackAlerts.geoContainment.alertTypeTitle', {
    defaultMessage: 'Tracking containment',
  });

  const actionGroupName = i18n.translate(
    'xpack.stackAlerts.geoContainment.actionGroupContainmentMetTitle',
    {
      defaultMessage: 'Tracking containment met',
    }
  );

  return {
    id: GEO_CONTAINMENT_ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    recoveryActionGroup: {
      id: RecoveryActionGroupId,
      name: i18n.translate('xpack.stackAlerts.geoContainment.notGeoContained', {
        defaultMessage: 'No longer contained',
      }),
    },
    defaultActionGroupId: ActionGroupId,
    executor: getGeoContainmentExecutor(logger),
    producer: STACK_ALERTS_FEATURE_ID,
    validate: {
      params: ParamsSchema,
    },
    actionVariables,
    minimumLicenseRequired: 'gold',
    isExportable: true,
  };
}
