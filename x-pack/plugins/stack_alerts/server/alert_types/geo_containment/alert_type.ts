/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Logger } from 'src/core/server';
import { STACK_ALERTS_FEATURE_ID } from '../../../common';
import { getGeoContainmentExecutor } from './geo_containment';
import {
  ActionGroup,
  AlertServices,
  ActionVariable,
  AlertTypeState,
} from '../../../../alerts/server';
import { Query } from '../../../../../../src/plugins/data/common/query';

export const GEO_CONTAINMENT_ID = '.geo-containment';
export type TrackingEvent = 'entered' | 'exited';
export const ActionGroupId = 'tracking containment met';

const actionVariableContextToEntityDateTimeLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextToEntityDateTimeLabel',
  {
    defaultMessage: `The time the entity was detected in the current boundary`,
  }
);

const actionVariableContextFromEntityDateTimeLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityDateTimeLabel',
  {
    defaultMessage: `The last time the entity was recorded in the previous boundary`,
  }
);

const actionVariableContextToEntityLocationLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextToEntityLocationLabel',
  {
    defaultMessage: 'The most recently captured location of the entity',
  }
);

const actionVariableContextCrossingLineLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextCrossingLineLabel',
  {
    defaultMessage:
      'GeoJSON line connecting the two locations that were used to determine the crossing event',
  }
);

const actionVariableContextFromEntityLocationLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityLocationLabel',
  {
    defaultMessage: 'The previously captured location of the entity',
  }
);

const actionVariableContextToBoundaryIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextCurrentBoundaryIdLabel',
  {
    defaultMessage: 'The current boundary id containing the entity (if any)',
  }
);

const actionVariableContextToBoundaryNameLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextToBoundaryNameLabel',
  {
    defaultMessage: 'The boundary (if any) the entity has crossed into and is currently located',
  }
);

const actionVariableContextFromBoundaryNameLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromBoundaryNameLabel',
  {
    defaultMessage: 'The boundary (if any) the entity has crossed from and was previously located',
  }
);

const actionVariableContextFromBoundaryIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromBoundaryIdLabel',
  {
    defaultMessage: 'The previous boundary id containing the entity (if any)',
  }
);

const actionVariableContextToEntityDocumentIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextCrossingDocumentIdLabel',
  {
    defaultMessage: 'The id of the crossing entity document',
  }
);

const actionVariableContextFromEntityDocumentIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextFromEntityDocumentIdLabel',
  {
    defaultMessage: 'The id of the crossing entity document',
  }
);

const actionVariableContextTimeOfDetectionLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextTimeOfDetectionLabel',
  {
    defaultMessage: 'The alert interval end time this change was recorded',
  }
);

const actionVariableContextEntityIdLabel = i18n.translate(
  'xpack.stackAlerts.geoContainment.actionVariableContextEntityIdLabel',
  {
    defaultMessage: 'The entity ID of the document that triggered the alert',
  }
);

const actionVariables = {
  context: [
    // Alert-specific data
    { name: 'entityId', description: actionVariableContextEntityIdLabel },
    { name: 'timeOfDetection', description: actionVariableContextTimeOfDetectionLabel },
    { name: 'crossingLine', description: actionVariableContextCrossingLineLabel },

    // Corresponds to a specific document in the entity-index
    { name: 'toEntityLocation', description: actionVariableContextToEntityLocationLabel },
    {
      name: 'toEntityDateTime',
      description: actionVariableContextToEntityDateTimeLabel,
    },
    { name: 'toEntityDocumentId', description: actionVariableContextToEntityDocumentIdLabel },

    //  Corresponds to a specific document in the boundary-index
    { name: 'toBoundaryId', description: actionVariableContextToBoundaryIdLabel },
    { name: 'toBoundaryName', description: actionVariableContextToBoundaryNameLabel },

    // Corresponds to a specific document in the entity-index (from)
    { name: 'fromEntityLocation', description: actionVariableContextFromEntityLocationLabel },
    { name: 'fromEntityDateTime', description: actionVariableContextFromEntityDateTimeLabel },
    { name: 'fromEntityDocumentId', description: actionVariableContextFromEntityDocumentIdLabel },

    // Corresponds to a specific document in the boundary-index (from)
    { name: 'fromBoundaryId', description: actionVariableContextFromBoundaryIdLabel },
    { name: 'fromBoundaryName', description: actionVariableContextFromBoundaryNameLabel },
  ],
};

export const ParamsSchema = schema.object({
  index: schema.string({ minLength: 1 }),
  indexId: schema.string({ minLength: 1 }),
  geoField: schema.string({ minLength: 1 }),
  entity: schema.string({ minLength: 1 }),
  dateField: schema.string({ minLength: 1 }),
  trackingEvent: schema.string({ minLength: 1 }),
  boundaryType: schema.string({ minLength: 1 }),
  boundaryIndexTitle: schema.string({ minLength: 1 }),
  boundaryIndexId: schema.string({ minLength: 1 }),
  boundaryGeoField: schema.string({ minLength: 1 }),
  boundaryNameField: schema.maybe(schema.string({ minLength: 1 })),
  delayOffsetWithUnits: schema.maybe(schema.string({ minLength: 1 })),
  indexQuery: schema.maybe(schema.any({})),
  boundaryIndexQuery: schema.maybe(schema.any({})),
});

export interface GeoContainmentParams {
  index: string;
  indexId: string;
  geoField: string;
  entity: string;
  dateField: string;
  trackingEvent: string;
  boundaryType: string;
  boundaryIndexTitle: string;
  boundaryIndexId: string;
  boundaryGeoField: string;
  boundaryNameField?: string;
  delayOffsetWithUnits?: string;
  indexQuery?: Query;
  boundaryIndexQuery?: Query;
}

export function getAlertType(
  logger: Logger
): {
  defaultActionGroupId: string;
  actionGroups: ActionGroup[];
  executor: ({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
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
  }) => Promise<AlertTypeState>;
  validate?: {
    params?: {
      validate: (object: unknown) => GeoContainmentParams;
    };
  };
  name: string;
  producer: string;
  id: string;
  actionVariables?: {
    context?: ActionVariable[];
    state?: ActionVariable[];
    params?: ActionVariable[];
  };
} {
  const alertTypeName = i18n.translate('xpack.stackAlerts.geoContainment.alertTypeTitle', {
    defaultMessage: 'Geo tracking containment',
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
    defaultActionGroupId: ActionGroupId,
    executor: getGeoContainmentExecutor(logger),
    producer: STACK_ALERTS_FEATURE_ID,
    validate: {
      params: ParamsSchema,
    },
    actionVariables,
  };
}
