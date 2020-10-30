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

export enum ILM_PAGES {
  LIST = 'policies_list',
  EDIT = 'policy_edit',
  CREATE = 'policy_create',
}

export interface IlmPoliciesListUrlGeneratorState {
  page: ILM_PAGES.LIST;
  absolute?: boolean;
}

export interface IlmPolicyEditUrlGeneratorState {
  page: ILM_PAGES.EDIT;
  policyName: string;
  absolute?: boolean;
}

export interface IlmPolicyCreateUrlGeneratorState {
  page: ILM_PAGES.CREATE;
  absolute?: boolean;
}

export type IlmUrlGeneratorState =
  | IlmPoliciesListUrlGeneratorState
  | IlmPolicyEditUrlGeneratorState
  | IlmPolicyCreateUrlGeneratorState;

export class IlmUrlGenerator implements UrlGeneratorsDefinition<typeof ILM_URL_GENERATOR_ID> {
  constructor(private readonly getAppBasePath: (absolute?: boolean) => Promise<string>) {}

  public readonly id = ILM_URL_GENERATOR_ID;

  public readonly createUrl = async (state: IlmUrlGeneratorState): Promise<string> => {
    switch (state.page) {
      case ILM_PAGES.CREATE: {
        return `${await this.getAppBasePath(!!state.absolute)}${getPolicyCreatePath()}`;
      }
      case ILM_PAGES.EDIT: {
        return `${await this.getAppBasePath(!!state.absolute)}${getPolicyEditPath(
          state.policyName
        )}`;
      }
      case ILM_PAGES.LIST: {
        return `${await this.getAppBasePath(!!state.absolute)}${getPoliciesListPath()}`;
      }
    }
  };
}

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

  share.urlGenerators.registerUrlGenerator(new IlmUrlGenerator(getAppBasePath));
};
