/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Logger, SavedObjectReference } from '@kbn/core/server';
import {
  RuleType,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RuleParamsAndRefs,
  RuleTypeParams,
} from '@kbn/alerting-plugin/server';
import { Query } from '@kbn/data-plugin/common/query';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { getGeoContainmentExecutor } from './geo_containment';

export const ActionGroupId = 'Tracked entity contained';
export const RecoveryActionGroupId = 'notGeoContained';

export const GEO_CONTAINMENT_ID = '.geo-containment';
export interface GeoContainmentParams extends RuleTypeParams {
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
export type GeoContainmentExtractedParams = Omit<
  GeoContainmentParams,
  'indexId' | 'boundaryIndexId'
> & {
  indexRefName: string;
  boundaryIndexRefName: string;
};

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

export interface GeoContainmentState extends RuleTypeState {
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

export type GeoContainmentAlertType = RuleType<
  GeoContainmentParams,
  GeoContainmentExtractedParams,
  GeoContainmentState,
  GeoContainmentInstanceState,
  GeoContainmentInstanceContext,
  typeof ActionGroupId,
  typeof RecoveryActionGroupId
>;

export function extractEntityAndBoundaryReferences(params: GeoContainmentParams): {
  params: GeoContainmentExtractedParams;
  references: SavedObjectReference[];
} {
  const { indexId, boundaryIndexId, ...otherParams } = params;

  //  Reference names omit the `param:`-prefix. This is handled by the alerting framework already
  const references = [
    {
      name: `tracked_index_${indexId}`,
      type: 'index-pattern',
      id: indexId as string,
    },
    {
      name: `boundary_index_${boundaryIndexId}`,
      type: 'index-pattern',
      id: boundaryIndexId as string,
    },
  ];
  return {
    params: {
      ...otherParams,
      indexRefName: `tracked_index_${indexId}`,
      boundaryIndexRefName: `boundary_index_${boundaryIndexId}`,
    },
    references,
  };
}

export function injectEntityAndBoundaryIds(
  params: GeoContainmentExtractedParams,
  references: SavedObjectReference[]
): GeoContainmentParams {
  const { indexRefName, boundaryIndexRefName, ...otherParams } = params;
  const { id: indexId = null } = references.find((ref) => ref.name === indexRefName) || {};
  const { id: boundaryIndexId = null } =
    references.find((ref) => ref.name === boundaryIndexRefName) || {};
  if (!indexId) {
    throw new Error(`Index "${indexId}" not found in references array`);
  }
  if (!boundaryIndexId) {
    throw new Error(`Boundary index "${boundaryIndexId}" not found in references array`);
  }
  return {
    ...otherParams,
    indexId,
    boundaryIndexId,
  } as GeoContainmentParams;
}

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
    useSavedObjectReferences: {
      extractReferences: (
        params: GeoContainmentParams
      ): RuleParamsAndRefs<GeoContainmentExtractedParams> => {
        return extractEntityAndBoundaryReferences(params);
      },
      injectReferences: (
        params: GeoContainmentExtractedParams,
        references: SavedObjectReference[]
      ) => {
        return injectEntityAndBoundaryIds(params, references);
      },
    },
  };
}
