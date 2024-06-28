/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NavigateToUrlOptions } from '@kbn/core/public';
import type { SecurityPageName } from '../../../../../../common';

export type NavigateToUrl = (
  url: string,
  options?: NavigateToUrlOptions | undefined
) => Promise<void>;

export type GetUrlForApp = (
  appId: string,
  options?:
    | {
        path?: string | undefined;
        absolute?: boolean | undefined;
        deepLinkId?: string | undefined;
      }
    | undefined
) => string;

export enum IntegrationsPageName {
  integrationsSecurity = 'integrations:/browse/security',
  integrationsSecurityCloud = 'integrations:/browse/security/cloudsecurity_cdr',
  integrationsSecurityEdrXrd = 'integrations:/browse/security/edr_xdr',
}

export const AddIntegrationCalloutStepLinkId = 'addIntegrationCallout';
export const ManageProjectsStepLinkId = 'manageProjects';

export type StepLinkId =
  | SecurityPageName.rules
  | 'addIntegrationCallout'
  | IntegrationsPageName.integrationsSecurityCloud
  | IntegrationsPageName.integrationsSecurityEdrXrd
  | IntegrationsPageName.integrationsSecurity
  | 'manageProjects'
  | SecurityPageName.alerts
  | SecurityPageName.dashboards;
