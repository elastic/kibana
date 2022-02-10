/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const TotalTime = ({ startTime, totalTime }) => {
  return (
    <EuiToolTip
      content={
        <FormattedMessage
          id="xpack.monitoring.elasticsearch.shardActivity.totalTimeTooltip"
          defaultMessage="Started: {startTime}"
          values={{
            startTime,
          }}
        />
      }
      position="bottom"
    >
      <EuiLink>{totalTime}</EuiLink>
    </EuiToolTip>
  );
};
