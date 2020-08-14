/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ComponentTemplateListItem,
  ComponentTemplateDeserialized,
  ComponentTemplateSerialized,
  Error,
} from '../shared_imports';
import {
  UIM_COMPONENT_TEMPLATE_DELETE_MANY,
  UIM_COMPONENT_TEMPLATE_DELETE,
  UIM_COMPONENT_TEMPLATE_CREATE,
  UIM_COMPONENT_TEMPLATE_UPDATE,
} from '../constants';
import { UseRequestHook, SendRequestHook } from './request';

export const getApi = (
  useRequest: UseRequestHook,
  sendRequest: SendRequestHook,
  apiBasePath: string,
  trackMetric: (type: 'loaded' | 'click' | 'count', eventName: string) => void
) => {
  function useLoadComponentTemplates() {
    return useRequest<ComponentTemplateListItem[], Error>({
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

  function useLoadComponentTemplate(name: string) {
    return useRequest<ComponentTemplateDeserialized>({
      path: `${apiBasePath}/component_templates/${encodeURIComponent(name)}`,
      method: 'get',
    });
  }

  async function createComponentTemplate(componentTemplate: ComponentTemplateSerialized) {
    const result = await sendRequest({
      path: `${apiBasePath}/component_templates`,
      method: 'post',
      body: JSON.stringify(componentTemplate),
    });

    trackMetric('count', UIM_COMPONENT_TEMPLATE_CREATE);

    return result;
  }

  async function updateComponentTemplate(componentTemplate: ComponentTemplateDeserialized) {
    const { name } = componentTemplate;
    const result = await sendRequest({
      path: `${apiBasePath}/component_templates/${encodeURIComponent(name)}`,
      method: 'put',
      body: JSON.stringify(componentTemplate),
    });

    trackMetric('count', UIM_COMPONENT_TEMPLATE_UPDATE);

    return result;
  }

  return {
    useLoadComponentTemplates,
    deleteComponentTemplates,
    useLoadComponentTemplate,
    createComponentTemplate,
    updateComponentTemplate,
  };
};
