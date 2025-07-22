/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { DataViewApiProvider } from './data_view_api';
import { deploymentAgnosticServices } from './deployment_agnostic_services';
import { PackageApiProvider } from './package_api';
import { RoleScopedSupertestProvider, SupertestWithRoleScope } from './role_scoped_supertest';
import { CustomRoleScopedSupertestProvider } from './custom_role_scoped_supertest';
import { services as apiIntegrationServices } from '../../api_integration/services';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...deploymentAgnosticServices,
  supertestWithoutAuth: commonFunctionalServices.supertestWithoutAuth,
  samlAuth: commonFunctionalServices.samlAuth,
  ml: apiIntegrationServices.ml,
  usageAPI: apiIntegrationServices.usageAPI,
  spaces: apiIntegrationServices.spaces,
  dataViewApi: DataViewApiProvider,
  packageApi: PackageApiProvider,
  roleScopedSupertest: RoleScopedSupertestProvider,
  customRoleScopedSupertest: CustomRoleScopedSupertestProvider,
  // create a new deployment-agnostic service and load here
};

export type SupertestWithRoleScopeType = SupertestWithRoleScope;
export type DeploymentAgnosticCommonServices = typeof services;
