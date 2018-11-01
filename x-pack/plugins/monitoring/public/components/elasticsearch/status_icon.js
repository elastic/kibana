/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatusIcon } from '../status_icon';
import { injectI18n } from '@kbn/i18n/react';

function ElasticsearchStatusIconUI({ intl, status }) {
  const type = (() => {
    const statusKey = status.toUpperCase();
    return StatusIcon.TYPES[statusKey] || StatusIcon.TYPES.GRAY;
  })();

  return (
    <StatusIcon
      type={type}
      label={intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.healthStatusLabel',
        defaultMessage: 'Health: {status}' }, {
        status
      })
      }
    />
  );
}

export const ElasticsearchStatusIcon = injectI18n(ElasticsearchStatusIconUI);
