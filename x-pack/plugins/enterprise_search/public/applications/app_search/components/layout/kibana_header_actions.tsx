/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EndpointsHeaderAction } from '../../../shared/layout/endpoints_header_action';
import { EngineLogic } from '../engine';
import { QueryTesterButton } from '../query_tester';

export const KibanaHeaderActions: React.FC = () => {
  const { engineName } = useValues(EngineLogic);

  return (
    <EndpointsHeaderAction>{Boolean(engineName) && <QueryTesterButton />}</EndpointsHeaderAction>
  );
};
