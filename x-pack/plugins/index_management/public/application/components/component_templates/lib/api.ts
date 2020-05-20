/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentTemplateDeserialized } from '../types';
import { UseRequestHook } from './use_request';

export const getApi = (useRequest: UseRequestHook, apiBasePath: string) => {
  function useComponentTemplates() {
    return useRequest<ComponentTemplateDeserialized[]>({
      path: `${apiBasePath}/component-templates`,
      method: 'get',
    });
  }

  return {
    useComponentTemplates,
  };
};
