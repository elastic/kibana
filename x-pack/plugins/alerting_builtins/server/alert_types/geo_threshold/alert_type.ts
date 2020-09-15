/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { Service } from '../../types';
import { BUILT_IN_ALERTS_FEATURE_ID } from '../../../common';
import { getGeoThresholdExecutor } from './geo_threshold';
import { AlertServices } from '../../../../alerts/server';

export const GEO_THRESHOLD_ID = '.geo-threshold';
export type TrackingEvent = 'entered' | 'exited';
export type BoundaryType = 'entireIndex'; // Will expand to cover more, i.e. - providedShapes, etc.
export const ActionGroupId = 'tracking threshold met';

const actionVariableContextCrossingEventTimeStampLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextEnteredTimeStampLabel',
  {
    defaultMessage: `The time the entity's crossing was recorded to arrive at its current location`,
  }
);

const actionVariableContextCurrentLocationLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextCurrentLocationLabel',
  {
    defaultMessage: 'The most recently captured location of the entity',
  }
);

const actionVariableContextPreviousLocationLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextPreviousLocationLabel',
  {
    defaultMessage: 'The previously captured location of the entity',
  }
);

const actionVariableContextCurrentBoundaryIdLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextCurrentBoundaryIdLabel',
  {
    defaultMessage: 'The current boundary id containing the entity (if any)',
  }
);

const actionVariableContextPreviousBoundaryIdLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextPreviousBoundaryIdLabel',
  {
    defaultMessage: 'The previous boundary id containing the entity (if any)',
  }
);

const actionVariableContextCrossingDocumentIdLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextCrossingDocumentIdLabel',
  {
    defaultMessage: 'The id of the crossing entity document',
  }
);

const actionVariableContextTimeOfDetectionLabel = i18n.translate(
  'xpack.alertingBuiltins.geoThreshold.actionVariableContextTimeOfDetectionLabel',
  {
    defaultMessage: 'The alert interval end time this change was recorded',
  }
);

export function getAlertType(
  service: Service
): {
  defaultActionGroupId: string;
  executor: ({
    previousStartedAt: currIntervalStartTime,
    startedAt: currIntervalEndTime,
    services,
    params,
  }: {
    previousStartedAt: Date | null;
    startedAt: Date;
    services: AlertServices;
    params: {
      index: string;
      geoField: string;
      entity: string;
      dateField: string;
      trackingEvent: TrackingEvent;
      boundaryType: BoundaryType;
      boundaryIndex: string;
      boundaryGeoField: string;
    };
  }) => Promise<void>;
  name: string;
  producer: string;
  id: string;
} {
  const alertTypeName = i18n.translate('xpack.alertingBuiltins.geoThreshold.alertTypeTitle', {
    defaultMessage: 'Geo tracking threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.alertingBuiltins.geoThreshold.actionGroupThresholdMetTitle',
    {
      defaultMessage: 'Tracking threshold Met',
    }
  );

  return {
    id: GEO_THRESHOLD_ID,
    name: alertTypeName,
    actionGroups: [{ id: ActionGroupId, name: actionGroupName }],
    defaultActionGroupId: ActionGroupId,
    actionVariables: [],
    executor: getGeoThresholdExecutor(service),
    producer: BUILT_IN_ALERTS_FEATURE_ID,
    validate: {
      params: schema.object({
        indexTitle: schema.string({ minLength: 1 }),
        indexId: schema.string({ minLength: 1 }),
        geoField: schema.string({ minLength: 1 }),
        entity: schema.string({ minLength: 1 }),
        dateField: schema.string({ minLength: 1 }),
        trackingEvent: schema.string({ minLength: 1 }),
        boundaryType: schema.string({ minLength: 1 }),
        boundaryIndexTitle: schema.string({ minLength: 1 }),
        boundaryIndexId: schema.string({ minLength: 1 }),
        boundaryGeoField: schema.string({ minLength: 1 }),
      }),
    },
    actionVariables: {
      context: [
        {
          name: 'crossingEventTimeStamp',
          description: actionVariableContextCrossingEventTimeStampLabel,
        },
        { name: 'currentLocation', description: actionVariableContextCurrentLocationLabel },
        { name: 'currentBoundaryId', description: actionVariableContextCurrentBoundaryIdLabel },
        { name: 'previousLocation', description: actionVariableContextPreviousLocationLabel },
        { name: 'previousBoundaryId', description: actionVariableContextPreviousBoundaryIdLabel },
        { name: 'crossingDocumentId', description: actionVariableContextCrossingDocumentIdLabel },
        { name: 'timeOfDetection', description: actionVariableContextTimeOfDetectionLabel },
      ],
    },
  };
}
