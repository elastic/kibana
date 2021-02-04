/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesDeleteParams } from 'elasticsearch';
import { CallWithRequest } from '../types';

export const deleteAllIndex = async (
  callWithRequest: CallWithRequest<IndicesDeleteParams, boolean>,
  index: string
): Promise<boolean> => {
  return callWithRequest('indices.delete', {
    index,
  });
};
