/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericFtrProviderContext } from '@kbn/test';
import { services as deploymentAgnosticSharedServices } from '../../shared/services/deployment_agnostic_services';
import { services as svlSharedServices } from '../../shared/services';

import { SamlToolsProvider } from './saml_tools';
import { SvlCasesServiceProvider } from './svl_cases';

import { SvlDatastreamsHelpers } from './index_management/svl_datastreams.helpers';
import { SynthtraceClientProvider } from './synthtrace';

export const services = {
  // deployment agnostic FTR services
  ...deploymentAgnosticSharedServices,

  // serverless FTR services
  ...svlSharedServices,
  samlTools: SamlToolsProvider,
  svlCases: SvlCasesServiceProvider,
  synthtrace: SynthtraceClientProvider,
  svlDatastreamsHelpers: SvlDatastreamsHelpers,
};

export type InheritedFtrProviderContext = GenericFtrProviderContext<typeof services, {}>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  {}
>
  ? TServices
  : {};

export type { SupertestWithRoleScopeType } from '../../shared/services';
