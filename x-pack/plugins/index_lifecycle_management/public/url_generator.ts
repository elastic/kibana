/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { UrlGeneratorsDefinition } from '../../../../src/plugins/share/public/';
import {
  getPoliciesListPath,
  getPolicyCreatePath,
  getPolicyEditPath,
} from './application/services/navigation';
import { MANAGEMENT_APP_ID } from '../../../../src/plugins/management/public';
import { SetupDependencies } from './types';
import { PLUGIN } from '../common/constants';

export const ILM_URL_GENERATOR_ID = 'ILM_URL_GENERATOR_ID';

export interface IlmUrlGeneratorState {
  page: 'policies_list' | 'policy_edit' | 'policy_create';
  policyName?: string;
  absolute?: boolean;
}
export const createIlmUrlGenerator = (
  getAppBasePath: (absolute?: boolean) => Promise<string>
): UrlGeneratorsDefinition<typeof ILM_URL_GENERATOR_ID> => {
  return {
    id: ILM_URL_GENERATOR_ID,
    createUrl: async (state: IlmUrlGeneratorState): Promise<string> => {
      switch (state.page) {
        case 'policy_create': {
          return `${await getAppBasePath(!!state.absolute)}${getPolicyCreatePath()}`;
        }
        case 'policy_edit': {
          return `${await getAppBasePath(!!state.absolute)}${getPolicyEditPath(state.policyName!)}`;
        }
        case 'policies_list': {
          return `${await getAppBasePath(!!state.absolute)}${getPoliciesListPath()}`;
        }
      }
    },
  };
};

export const registerUrlGenerator = (
  coreSetup: CoreSetup,
  management: SetupDependencies['management'],
  share: SetupDependencies['share']
) => {
  const getAppBasePath = async (absolute = false) => {
    const [coreStart] = await coreSetup.getStartServices();
    return coreStart.application.getUrlForApp(MANAGEMENT_APP_ID, {
      path: management.sections.section.data.getApp(PLUGIN.ID)!.basePath,
      absolute,
    });
  };

  share.urlGenerators.registerUrlGenerator(createIlmUrlGenerator(getAppBasePath));
};
