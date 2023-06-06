/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ConnectorContentScheduling } from './connector_scheduling/full_content';

export const ConnectorSchedulingComponent: React.FC = () => {
  return (
    <>
      <ConnectorContentScheduling type="full" />
      <ConnectorContentScheduling type="incremental" />
    </>
  );
};

export interface Schedule {
  days: string;
  hours: string;
  minutes: string;
}
