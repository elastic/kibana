/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiHealth, EuiToolTip } from '@elastic/eui';

import {
  type TransformHealth,
  TRANSFORM_HEALTH_COLOR,
  TRANSFORM_HEALTH_DESCRIPTION,
  TRANSFORM_HEALTH_LABEL,
} from '../../../../../../common/constants';

interface TransformHealthProps {
  healthStatus: TransformHealth;
  compact?: boolean;
}

export const TransformHealthColoredDot: FC<TransformHealthProps> = ({
  healthStatus,
  compact = true,
}) => {
  return compact ? (
    <EuiToolTip content={TRANSFORM_HEALTH_DESCRIPTION[healthStatus]}>
      <EuiHealth color={TRANSFORM_HEALTH_COLOR[healthStatus]}>
        <small>{TRANSFORM_HEALTH_LABEL[healthStatus]}</small>
      </EuiHealth>
    </EuiToolTip>
  ) : (
    <EuiHealth color={TRANSFORM_HEALTH_COLOR[healthStatus]}>
      {TRANSFORM_HEALTH_DESCRIPTION[healthStatus]}
    </EuiHealth>
  );
};
