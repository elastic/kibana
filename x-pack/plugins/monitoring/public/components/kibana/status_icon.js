/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StatusIcon, STATUS_ICON_TYPES } from '../status_icon';
import { i18n } from '@kbn/i18n';

export function KibanaStatusIcon({ status, availability = true }) {
  const type = (() => {
    if (!availability) {
      return STATUS_ICON_TYPES.GRAY;
    }

    const statusKey = status.toUpperCase();
    return STATUS_ICON_TYPES[statusKey] || STATUS_ICON_TYPES.YELLOW;
  })();

  return (
    <StatusIcon
      type={type}
      label={i18n.translate('xpack.monitoring.kibana.statusIconLabel', {
        defaultMessage: 'Health: {status}',
        values: {
          status,
        },
      })}
    />
  );
}
