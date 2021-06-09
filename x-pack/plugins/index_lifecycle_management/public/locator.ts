/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import { SerializableState } from 'src/plugins/kibana_utils/common';
import { LocatorDefinition } from '../../../../src/plugins/share/public/';
import {
  getPoliciesListPath,
  getPolicyCreatePath,
  getPolicyEditPath,
} from './application/services/navigation';
import { MANAGEMENT_APP_ID } from '../../../../src/plugins/management/public';
import { SetupDependencies } from './types';
import { PLUGIN } from '../common/constants';

export const ILM_LOCATOR_ID = 'ILM_LOCATOR_ID';

export interface IlmLocatorParams extends SerializableState {
  page: 'policies_list' | 'policy_edit' | 'policy_create';
  policyName?: string;
}

export interface IlmLocatorDependencies {
  getAppBasePath: (absolute?: boolean) => Promise<string>;
}

export class IlmLocator implements LocatorDefinition<IlmLocatorParams> {
  constructor(protected readonly deps: IlmLocatorDependencies) {}

  public readonly id = ILM_LOCATOR_ID;

  public readonly getLocation = async (params: IlmLocatorParams) => {
    switch (params.page) {
      case 'policy_create': {
        return {
          app: MANAGEMENT_APP_ID, // await this.deps.getAppBasePath(false),
          route: getPolicyCreatePath(),
          state: {},
        };
      }
      case 'policy_edit': {
        return {
          app: await this.deps.getAppBasePath(false),
          route: getPolicyEditPath(params.policyName!),
          state: {},
        };
      }
      case 'policies_list': {
        return {
          app: await this.deps.getAppBasePath(false),
          route: getPoliciesListPath(),
          state: {},
        };
      }
    }
  };
}

export const registerLocator = (
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
  share.url.locators.create(new IlmLocator({ getAppBasePath }));
};
