/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesExistsTemplateParams } from 'elasticsearch';
import { CallWithRequest } from '../types';

export const getTemplateExists = async (
  callWithRequest: CallWithRequest<IndicesExistsTemplateParams, boolean>,
  template: string
): Promise<boolean> => {
  return callWithRequest('indices.existsTemplate', {
    name: template,
  });
};
