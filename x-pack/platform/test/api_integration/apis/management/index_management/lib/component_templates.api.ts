/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

import { API_BASE_PATH } from '../constants';
import { FtrProviderContext } from '../../../../ftr_provider_context';

type Options = Partial<ClusterPutComponentTemplateRequest> | { _kbnMeta: Record<string, any> };

export function componentTemplatesApi(getService: FtrProviderContext['getService']) {
  const supertest = getService('supertest');

  const createComponentTemplate = (name: string, options: Options) =>
    supertest
      .post(`${API_BASE_PATH}/component_templates`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx')
      .send({ name, ...options });

  const getAllComponentTemplates = () =>
    supertest
      .get(`${API_BASE_PATH}/component_templates`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  const getOneComponentTemplate = (name: string) =>
    supertest
      .get(`${API_BASE_PATH}/component_templates/${name}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  const updateComponentTemplate = (name: string, options: Options) =>
    supertest
      .put(`${API_BASE_PATH}/component_templates/${name}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx')
      .send({
        name,
        ...options,
      });

  const deleteComponentTemplate = (name: string) =>
    supertest
      .delete(`${API_BASE_PATH}/component_templates/${name}`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  const getComponentTemplateDatastreams = (name: string) =>
    supertest
      .get(`${API_BASE_PATH}/component_templates/${name}/datastreams`)
      .set('kbn-xsrf', 'xxx')
      .set('x-elastic-internal-origin', 'xxx');

  return {
    createComponentTemplate,
    getAllComponentTemplates,
    getOneComponentTemplate,
    updateComponentTemplate,
    deleteComponentTemplate,
    getComponentTemplateDatastreams,
  };
}
