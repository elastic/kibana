/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiStat } from '@elastic/eui';
import { ERRORS_LABEL } from '../../../../monitor_details/monitor_summary/monitor_errors_count';

interface MonitorErrorsCountProps {
  from: string;
  to: string;
  locationLabel?: string;
  monitorIds: string[];
  locations?: string[];
  totalErrors: number;
}

export const OverviewErrorsCount = ({
  monitorIds,
  from,
  to,
  locations,
  totalErrors,
}: MonitorErrorsCountProps) => {
  const time = useMemo(() => ({ from, to }), [from, to]);

  return <EuiStat description={ERRORS_LABEL} title={totalErrors} titleColor="danger" reverse />;
};
