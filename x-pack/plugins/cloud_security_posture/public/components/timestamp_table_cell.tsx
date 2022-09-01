/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment, { type MomentInput } from 'moment';
import { EuiToolTip } from '@elastic/eui';
import { CSP_MOMENT_FORMAT } from '../common/constants';

export const TimestampTableCell = ({ timestamp }: { timestamp: MomentInput }) => (
  <EuiToolTip position="top" content={moment(timestamp).format(CSP_MOMENT_FORMAT)}>
    <span>{moment(timestamp).fromNow()}</span>
  </EuiToolTip>
);
