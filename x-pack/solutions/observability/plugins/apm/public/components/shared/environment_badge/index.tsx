/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ItemsBadge } from '../item_badge';
import { NotAvailableEnvironment } from '../not_available_popover/not_available_environment';
import {
  ENVIRONMENT_NOT_DEFINED_VALUE,
  getEnvironmentLabel,
} from '../../../../common/environment_filter_values';

interface Props {
  environments: string[];
  isMetricsSignalType?: boolean;
}

export function EnvironmentBadge({ environments = [], isMetricsSignalType = true }: Props) {
  const _environments = environments.length
    ? environments
    : [getEnvironmentLabel(ENVIRONMENT_NOT_DEFINED_VALUE)];
  return isMetricsSignalType || (_environments && _environments.length > 0) ? (
    <ItemsBadge
      items={_environments ?? []}
      multipleItemsMessage={i18n.translate('xpack.apm.servicesTable.environmentCount', {
        values: { environmentCount: _environments.length },
        defaultMessage: '{environmentCount, plural, one {1 environment} other {# environments}}',
      })}
    />
  ) : (
    <NotAvailableEnvironment />
  );
}
