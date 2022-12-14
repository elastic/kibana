/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { mockedEngines } from '../../components/engines/_mocks_/mocked_engines';
import { EngineListDetails } from '../../components/engines/types';

export type FetchEnginesApiLogicResponse = EngineListDetails[];

export const fetchEngines = async () => {
  // TODO replace with http call when backed is ready
  return mockedEngines;
};

export const FetchEnginesAPILogic = createApiLogic(['content', 'engines_api_logic'], fetchEngines);
