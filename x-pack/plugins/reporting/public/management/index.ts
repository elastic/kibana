/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, ToastsSetup } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ClientConfigType } from '@kbn/reporting-public';
import type { UseIlmPolicyStatusReturn } from '../lib/ilm_policy_status_context';
import type { ReportingAPIClient } from '../lib/reporting_api_client';
import type { SharePluginSetup } from '../shared_imports';

export interface ListingProps {
  apiClient: ReportingAPIClient;
  capabilities: ApplicationStart['capabilities'];
  license$: LicensingPluginStart['license$'];
  config: ClientConfigType;
  redirect: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  toasts: ToastsSetup;
  urlService: SharePluginSetup['url'];
  ilmPolicyContextValue: UseIlmPolicyStatusReturn;
}

export { ReportListing } from './report_listing';
