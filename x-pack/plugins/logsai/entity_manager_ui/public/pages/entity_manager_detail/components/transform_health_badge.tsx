/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';
import { lowerCase } from 'lodash';

type TransformState = 'green' | 'unknown' | 'yellow' | 'red';

interface TransformHealthBadgeProps {
  healthStatus: HealthStatus | 'unknown';
}

const stateToEuiColor: Record<TransformState, string> = {
  green: 'success',
  unknown: 'default',
  yellow: 'warning',
  red: 'critical',
};

const stateToLabel: Record<TransformState, string> = {
  green: i18n.translate('xpack.entityManager.transformBadge.greenLabel', {
    defaultMessage: 'Healthy',
  }),
  unknown: i18n.translate('xpack.entityManager.transformBadge.unknownLabel', {
    defaultMessage: 'Unknown',
  }),
  yellow: i18n.translate('xpack.entityManager.transformBadge.degradedLabel', {
    defaultMessage: 'Degraded',
  }),
  red: i18n.translate('xpack.entityManager.transformBadge.unavailableLabel', {
    defaultMessage: 'Unavailable',
  }),
};

export function TransformHealthBadge({ healthStatus }: TransformHealthBadgeProps) {
  const state = lowerCase(healthStatus) as TransformState;
  return <EuiBadge color={stateToEuiColor[state]}>{stateToLabel[state]}</EuiBadge>;
}
