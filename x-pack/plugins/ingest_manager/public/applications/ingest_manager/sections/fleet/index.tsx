/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { useConfig } from '../../hooks';

export const FleetApp: React.FunctionComponent = () => {
  const { fleet } = useConfig();
  return fleet.enabled ? <div>hello world - fleet app</div> : null;
};
