/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentTemplateDeserialized } from '../../../../../common';
import { API_BASE_PATH } from '../../../../../common/constants';
import { useRequest } from '../../../services/use_request';

export const useComponentTemplates = () => {
  return useRequest<ComponentTemplateDeserialized[]>({
    path: `${API_BASE_PATH}/component-templates`,
    method: 'get',
  });
};
