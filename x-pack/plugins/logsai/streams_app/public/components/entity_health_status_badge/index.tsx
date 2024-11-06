/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EntityHealthStatus } from '@kbn/streams-api-plugin/common';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function EntityHealthStatusBadge({
  healthStatus,
}: {
  healthStatus: EntityHealthStatus | null;
}) {
  if (healthStatus === 'Violated') {
    return (
      <EuiBadge color="danger">
        {i18n.translate('xpack.entities.healthStatus.violatedBadgeLabel', {
          defaultMessage: 'Violated',
        })}
      </EuiBadge>
    );
  }

  if (healthStatus === 'Degraded') {
    return (
      <EuiBadge color="warning">
        {i18n.translate('xpack.entities.healthStatus.degradedBadgeLabel', {
          defaultMessage: 'Degraded',
        })}
      </EuiBadge>
    );
  }

  if (healthStatus === 'NoData') {
    return (
      <EuiBadge color="warning">
        {i18n.translate('xpack.entities.healthStatus.noDataBadgeLabel', {
          defaultMessage: 'No data',
        })}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="success">
      {i18n.translate('xpack.entities.healthStatus.healthyBadgeLabel', {
        defaultMessage: 'Healthy',
      })}
    </EuiBadge>
  );
}
