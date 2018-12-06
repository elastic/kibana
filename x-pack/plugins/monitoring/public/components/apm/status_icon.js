/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatusIcon } from 'plugins/monitoring/components/status_icon';
import { injectI18n } from '@kbn/i18n/react';

function ApmStatusIconUI({ status, availability = true, intl }) {
  const type = (() => {
    if (!availability) {
      return StatusIcon.TYPES.GRAY;
    }

    const statusKey = status.toUpperCase();
    return StatusIcon.TYPES[statusKey] || StatusIcon.TYPES.YELLOW;
  })();

  return (
    <StatusIcon
      type={type}
      label={intl.formatMessage({
        id: 'xpack.monitoring.apm.healthStatusLabel',
        defaultMessage: 'Health: {status}' }, {
        status
      })}
    />
  );
}

export const ApmStatusIcon = injectI18n(ApmStatusIconUI);
