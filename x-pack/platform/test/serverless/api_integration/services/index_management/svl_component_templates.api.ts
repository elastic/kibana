/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

import { API_BASE_PATH } from './constants';
import { RoleCredentials } from '../../../shared/services';
import { FtrProviderContext } from '../../ftr_provider_context';

type Options = Partial<ClusterPutComponentTemplateRequest> | { _kbnMeta: Record<string, any> };

export function SvlComponentTemplatesApi({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');

  const createComponentTemplate = async (
    name: string,
    options: Options,
    roleAuthc: RoleCredentials
  ) =>
    await supertestWithoutAuth
      .post(`${API_BASE_PATH}/component_templates`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send({ name, ...options });

  const getAllComponentTemplates = async (roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .get(`${API_BASE_PATH}/component_templates`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const getOneComponentTemplate = async (name: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .get(`${API_BASE_PATH}/component_templates/${name}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const updateComponentTemplate = async (
    name: string,
    options: Options,
    roleAuthc: RoleCredentials
  ) =>
    await supertestWithoutAuth
      .get(`${API_BASE_PATH}/component_templates/${name}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader)
      .send({
        name,
        ...options,
      });

  const deleteComponentTemplate = async (name: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .delete(`${API_BASE_PATH}/component_templates/${name}`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  const getComponentTemplateDatastreams = async (name: string, roleAuthc: RoleCredentials) =>
    await supertestWithoutAuth
      .get(`${API_BASE_PATH}/component_templates/${name}/datastreams`)
      .set(svlCommonApi.getInternalRequestHeader())
      .set(roleAuthc.apiKeyHeader);

  return {
    createComponentTemplate,
    getAllComponentTemplates,
    getOneComponentTemplate,
    updateComponentTemplate,
    deleteComponentTemplate,
    getComponentTemplateDatastreams,
  };
}
