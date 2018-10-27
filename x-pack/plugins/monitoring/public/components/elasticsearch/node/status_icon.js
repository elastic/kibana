/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatusIcon } from '../../status_icon';
import { FormattedMessage } from '@kbn/i18n/react';

export function NodeStatusIcon({ isOnline, status }) {
  const type = isOnline ? StatusIcon.TYPES.GREEN : StatusIcon.TYPES.GRAY;

  return (
    <StatusIcon
      type={type}
      label={
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.node.statusIconLabel"
          defaultMessage="Status: {status}"
          values={{
            status
          }}
        />
      }
    />
  );
}
