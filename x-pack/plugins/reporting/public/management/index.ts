/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart, ToastsSetup } from 'src/core/public';
import { LicensingPluginStart } from '../../../licensing/public';
import { UseIlmPolicyStatusReturn } from '../lib/ilm_policy_status_context';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ClientConfigType } from '../plugin';
import type { SharePluginSetup } from '../shared_imports';

export interface ListingProps {
  apiClient: ReportingAPIClient;
  capabilities: ApplicationStart['capabilities'];
  license$: LicensingPluginStart['license$'];
  pollConfig: ClientConfigType['poll'];
  redirect: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  toasts: ToastsSetup;
  urlService: SharePluginSetup['url'];
  ilmPolicyContextValue: UseIlmPolicyStatusReturn;
}

export { ReportListing } from './report_listing';
