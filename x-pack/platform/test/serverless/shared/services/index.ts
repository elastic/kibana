/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { services as platformDeploymentAgnosticServices } from '../../../api_integration_deployment_agnostic/services';
import { services as commonDeploymentAgnosticServices } from './deployment_agnostic_services';
import { SupertestProvider } from './supertest';
import { SvlCommonApiServiceProvider } from './svl_common_api';
import { SvlReportingServiceProvider } from './svl_reporting';
import { PlatformSecurityUtilsProvider } from './platform_security_utils';
import { AlertingApiProvider } from './alerting_api';

export type {
  InternalRequestHeader,
  RoleCredentials,
  SupertestWithoutAuthProviderType,
} from '@kbn/ftr-common-functional-services';

export const services = {
  ...commonDeploymentAgnosticServices,
  svlUserManager: platformDeploymentAgnosticServices.samlAuth,
  samlAuth: platformDeploymentAgnosticServices.samlAuth,
  roleScopedSupertest: platformDeploymentAgnosticServices.roleScopedSupertest,
  customRoleScopedSupertest: platformDeploymentAgnosticServices.customRoleScopedSupertest,
  dataViewApi: platformDeploymentAgnosticServices.dataViewApi,
  // custom svl services
  alertingApi: AlertingApiProvider,
  supertest: SupertestProvider,
  svlCommonApi: SvlCommonApiServiceProvider,
  svlReportingApi: SvlReportingServiceProvider,
  platformSecurityUtils: PlatformSecurityUtilsProvider,
};

export type { SupertestWithRoleScopeType } from '../../../api_integration_deployment_agnostic/services';
