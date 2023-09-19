/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { SavedObjectReference } from '@kbn/core/server';
import { RuleParamsAndRefs } from '@kbn/alerting-plugin/server';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import type {
  GeoContainmentRuleType,
  GeoContainmentExtractedRuleParams,
  GeoContainmentRuleParams,
} from './types';
import { executor } from './executor';
import { ActionGroupId, RecoveryActionGroupId, GEO_CONTAINMENT_ID } from './constants';

const actionVariables = {
  context: [
    // Alert-specific data
    {
      name: 'entityId',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextEntityIdLabel',
        {
          defaultMessage: 'The entity ID of the document that triggered the alert',
        }
      ),
    },
    {
      name: 'entityDateTime',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityDateTimeLabel',
        {
          defaultMessage: `The date the entity was recorded in the boundary`,
        }
      ),
    },
    {
      name: 'entityDocumentId',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityDocumentIdLabel',
        {
          defaultMessage: 'The id of the contained entity document',
        }
      ),
    },
    {
      name: 'detectionDateTime',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextDetectionDateTimeLabel',
        {
          defaultMessage: 'The alert interval end time this change was recorded',
        }
      ),
    },
    {
      name: 'entityLocation',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityLocationLabel',
        {
          defaultMessage: 'The location of the entity',
        }
      ),
    },
    {
      name: 'containingBoundaryId',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextContainingBoundaryIdLabel',
        {
          defaultMessage:
            'The id of the boundary containing the entity. Value not set for recovered alerts',
        }
      ),
    },
    {
      name: 'containingBoundaryName',
      description: i18n.translate(
        'xpack.stackAlerts.geoContainment.actionVariableContextContainingBoundaryNameLabel',
        {
          defaultMessage:
            'The name of the boundary containing the entity. Value not set for recovered alerts',
        }
      ),
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

export function extractEntityAndBoundaryReferences(params: GeoContainmentRuleParams): {
  params: GeoContainmentExtractedRuleParams;
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
  params: GeoContainmentExtractedRuleParams,
  references: SavedObjectReference[]
): GeoContainmentRuleParams {
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
  } as GeoContainmentRuleParams;
}

export function getRuleType(): GeoContainmentRuleType {
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
    doesSetRecoveryContext: true,
    defaultActionGroupId: ActionGroupId,
    executor,
    producer: STACK_ALERTS_FEATURE_ID,
    validate: {
      params: ParamsSchema,
    },
    actionVariables,
    minimumLicenseRequired: 'gold',
    isExportable: true,
    useSavedObjectReferences: {
      extractReferences: (
        params: GeoContainmentRuleParams
      ): RuleParamsAndRefs<GeoContainmentExtractedRuleParams> => {
        return extractEntityAndBoundaryReferences(params);
      },
      injectReferences: (
        params: GeoContainmentExtractedRuleParams,
        references: SavedObjectReference[]
      ) => {
        return injectEntityAndBoundaryIds(params, references);
      },
    },
  };
}
