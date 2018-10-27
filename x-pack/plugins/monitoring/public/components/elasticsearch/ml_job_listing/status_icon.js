/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatusIcon } from 'plugins/monitoring/components/status_icon';
import { FormattedMessage } from '@kbn/i18n/react';

export function MachineLearningJobStatusIcon({ status }) {
  const type = (() => {
    const statusKey = status.toUpperCase();

    if (statusKey === 'OPENED') {
      return StatusIcon.TYPES.GREEN;
    } else if (statusKey === 'CLOSED') {
      return StatusIcon.TYPES.GRAY;
    } else if (statusKey === 'FAILED') {
      return StatusIcon.TYPES.RED;
    }

    // basically a "changing" state like OPENING or CLOSING
    return StatusIcon.TYPES.YELLOW;
  })();

  return (
    <StatusIcon
      type={type}
      label={(
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.mlJobListing.statusIconLabel"
          defaultMessage="Job Status: {status}"
          values={{
            status
          }}
        />
      )}
    />
  );
}
