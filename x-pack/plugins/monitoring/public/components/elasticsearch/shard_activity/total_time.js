/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { FormattedMessage } from '@kbn/i18n/react';

export const TotalTime = ({ startTime, totalTime }) => {
  return (
    <Tooltip
      text={
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.shardActivity.totalTimeTooltip"
          defaultMessage="Started: {startTime}"
          values={{
            startTime
          }}
        />
      }
      placement="bottom"
      trigger="hover"
    >
      <EuiLink>{totalTime}</EuiLink>
    </Tooltip>
  );
};
