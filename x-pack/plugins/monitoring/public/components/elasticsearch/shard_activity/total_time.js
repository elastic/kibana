/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { Tooltip } from 'plugins/monitoring/components/tooltip';

export const TotalTime = ({ startTime, totalTime }) => {
  return (
    <Tooltip text={`Started: ${startTime}`} placement="bottom" trigger="hover">
      <EuiLink>{totalTime}</EuiLink>
    </Tooltip>
  );
};
