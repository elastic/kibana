/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StatusIcon } from '../../status_icon';
import { i18n } from '@kbn/i18n';

export function NodeStatusIcon({ isOnline, status }) {
  const type = isOnline ? StatusIcon.TYPES.GREEN : StatusIcon.TYPES.GRAY;

  return (
    <StatusIcon
      type={type}
      label={i18n.translate('xpack.monitoring.elasticsearch.node.statusIconLabel', {
        defaultMessage: 'Status: {status}',
        values: { status },
      })}
    />
  );
}
