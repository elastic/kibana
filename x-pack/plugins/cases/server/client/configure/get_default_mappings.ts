/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetDefaultMappingsResponse } from '../../../common';
import { ConfigureFields } from '../types';
import { createDefaultMapping } from './utils';

export const getDefaultMappings = async ({
  connectorType,
}: ConfigureFields): Promise<GetDefaultMappingsResponse> => {
  return createDefaultMapping(connectorType);
};
