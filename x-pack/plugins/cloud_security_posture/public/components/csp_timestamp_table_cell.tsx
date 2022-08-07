/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment, { type MomentInput } from 'moment';
import { EuiToolTip } from '@elastic/eui';

export const CspTimestampTableCell = ({ timestamp }: { timestamp: MomentInput }) => (
  <EuiToolTip position="top" content={moment(timestamp).format('MMMM D, YYYY @ HH:mm:ss.SSS')}>
    <span>{moment(timestamp).fromNow()}</span>
  </EuiToolTip>
);
