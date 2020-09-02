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
  const alertTypeName = i18n.translate('xpack.alertingBuiltins.indexThreshold.alertTypeTitle', {
    defaultMessage: 'Geo tracking threshold',
  });

  const actionGroupName = i18n.translate(
    'xpack.alertingBuiltins.indexThreshold.actionGroupThresholdMetTitle',
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
        index: schema.string({ minLength: 1 }),
        geoField: schema.string({ minLength: 1 }),
        entity: schema.string({ minLength: 1 }),
        dateField: schema.string({ minLength: 1 }),
        trackingEvent: schema.string({ minLength: 1 }),
        boundaryType: schema.string({ minLength: 1 }),
        boundaryIndex: schema.string({ minLength: 1 }),
        boundaryGeoField: schema.string({ minLength: 1 }),
      }),
    },
  };
}
