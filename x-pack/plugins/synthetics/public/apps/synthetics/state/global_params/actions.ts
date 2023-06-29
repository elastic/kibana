/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '@kbn/core-saved-objects-common';
import { SyntheticsParamRequest, SyntheticsParamSO } from '../../../../../common/runtime_types';
import { createAsyncAction } from '../utils/actions';

export const getGlobalParamAction = createAsyncAction<void, Array<SavedObject<SyntheticsParamSO>>>(
  'GET GLOBAL PARAMS'
);

export const addNewGlobalParamAction = createAsyncAction<SyntheticsParamRequest, SyntheticsParamSO>(
  'ADD NEW GLOBAL PARAM'
);

export const editGlobalParamAction = createAsyncAction<
  {
    id: string;
    paramRequest: SyntheticsParamRequest;
  },
  SyntheticsParamSO
>('EDIT GLOBAL PARAM');
