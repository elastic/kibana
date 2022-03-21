/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FleetServerInstructions as FleetServerInstructionsComponent } from './index';

export const FleetServerInstructions = () => {
  return <FleetServerInstructionsComponent />;
};

FleetServerInstructions.args = {
  isCloudEnabled: false,
};

export default {
  component: FleetServerInstructions,
  title: 'Sections/Fleet/Agents/Fleet Server Instructions/Without Flyout',
};
