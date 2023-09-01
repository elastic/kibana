/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsParamRequest, SyntheticsParams } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

export const getGlobalParamAction = createAsyncAction<void, SyntheticsParams[]>(
  'GET GLOBAL PARAMS'
);

export const addNewGlobalParamAction = createAsyncAction<SyntheticsParamRequest, SyntheticsParams>(
  'ADD NEW GLOBAL PARAM'
);

export const editGlobalParamAction = createAsyncAction<
  {
    id: string;
    paramRequest: SyntheticsParamRequest;
  },
  SyntheticsParams
>('EDIT GLOBAL PARAM');
