/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge } from '@elastic/eui';

interface TransformStatusBadgeProps {
  status: string;
}

function statusToColorAndLabel(status: string) {
  switch (status) {
    case 'aborting':
      return {
        color: 'danger',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.abortingLabel', {
          defaultMessage: 'Aborting',
        }),
      };
    case 'failed':
      return {
        color: 'danger',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.faliedLabel', {
          defaultMessage: 'Failed',
        }),
      };
    case 'indexing':
      return {
        color: 'primary',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.indexingLabel', {
          defaultMessage: 'Indexing',
        }),
      };
    case 'started':
      return {
        color: 'primary',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.startedLabel', {
          defaultMessage: 'Started',
        }),
      };
    case 'stopped':
      return {
        color: 'danger',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.stoppedLabel', {
          defaultMessage: 'Stopped',
        }),
      };
    case 'stopping':
      return {
        color: 'danger',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.stoppingLabel', {
          defaultMessage: 'Stopping',
        }),
      };
    default:
      return {
        color: 'default',
        label: i18n.translate('xpack.entityManager.transformStatusBadge.unkonwnLabel', {
          defaultMessage: 'Unknown',
        }),
      };
  }
}

export function TransformStatusBadge({ status }: TransformStatusBadgeProps) {
  const { color, label } = statusToColorAndLabel(status);
  return <EuiBadge color={color}>{label}</EuiBadge>;
}
