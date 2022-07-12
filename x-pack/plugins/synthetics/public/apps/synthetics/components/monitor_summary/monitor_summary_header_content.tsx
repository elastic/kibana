/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { MonitorSummaryTabs } from './monitor_summary_tabs';
import { selectLatestPing } from '../../state/monitor_details';

export const MonitorSummaryHeaderContent = () => {
  const latestPing = useSelector(selectLatestPing);

  if (!latestPing) {
    return <></>;
  }

  return (
    <>
      <MonitorSummaryTabs />
    </>
  );
};
