/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentTemplateListItem } from '../types';
import { UseRequestHook, SendRequestHook } from './request';
import { UIM_COMPONENT_TEMPLATE_DELETE_MANY, UIM_COMPONENT_TEMPLATE_DELETE } from '../constants';

export const getApi = (
  useRequest: UseRequestHook,
  sendRequest: SendRequestHook,
  apiBasePath: string,
  trackMetric: (type: 'loaded' | 'click' | 'count', eventName: string) => void
) => {
  function useLoadComponentTemplates() {
    return useRequest<ComponentTemplateListItem[]>({
      path: `${apiBasePath}/component_templates`,
      method: 'get',
    });
  }

  function deleteComponentTemplates(names: string[]) {
    const result = sendRequest({
      path: `${apiBasePath}/component_templates/${names
        .map((name) => encodeURIComponent(name))
        .join(',')}`,
      method: 'delete',
    });

    trackMetric(
      'count',
      names.length > 1 ? UIM_COMPONENT_TEMPLATE_DELETE_MANY : UIM_COMPONENT_TEMPLATE_DELETE
    );

    return result;
  }

  return {
    useLoadComponentTemplates,
    deleteComponentTemplates,
  };
};
