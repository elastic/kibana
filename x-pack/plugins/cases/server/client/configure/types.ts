/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseConnector } from '../../../common/api';
import { IndexRefresh } from '../../services/types';

export interface MappingsArgs {
  connector: CaseConnector;
}

export interface CreateMappingsArgs extends MappingsArgs, IndexRefresh {
  owner: string;
}

export interface UpdateMappingsArgs extends MappingsArgs, IndexRefresh {
  mappingId: string;
}
