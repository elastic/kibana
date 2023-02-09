/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MonitorFailedTests } from '../../monitor_details/monitor_errors/failed_tests';

export const ErrorTimeline = () => {
  return <MonitorFailedTests time={{ from: 'now-1h', to: 'now' }} />;
};
