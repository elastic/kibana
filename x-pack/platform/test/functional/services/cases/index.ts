/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';
import { CasesAPIServiceProvider } from './api';
import { CasesCommonServiceProvider } from './common';
import { CasesCreateViewServiceProvider } from './create';
import { CasesFilesTableServiceProvider } from './files';
import { CasesTableServiceProvider } from './list';
import { CasesNavigationProvider } from './navigation';
import { CasesSingleViewServiceProvider } from './single_case_view';
import { CasesTestResourcesServiceProvider } from './test_resources';

export interface CasesService {
  api: ReturnType<typeof CasesAPIServiceProvider>;
  common: ReturnType<typeof CasesCommonServiceProvider>;
  casesTable: ReturnType<typeof CasesTableServiceProvider>;
  casesFilesTable: ReturnType<typeof CasesFilesTableServiceProvider>;
  create: ReturnType<typeof CasesCreateViewServiceProvider>;
  navigation: ReturnType<typeof CasesNavigationProvider>;
  singleCase: ReturnType<typeof CasesSingleViewServiceProvider>;
  testResources: ReturnType<typeof CasesTestResourcesServiceProvider>;
}

export function CasesServiceProvider(context: FtrProviderContext): CasesService {
  const casesCommon = CasesCommonServiceProvider(context);

  return {
    api: CasesAPIServiceProvider(context),
    common: casesCommon,
    casesTable: CasesTableServiceProvider(context, casesCommon),
    casesFilesTable: CasesFilesTableServiceProvider(context),
    create: CasesCreateViewServiceProvider(context, casesCommon),
    navigation: CasesNavigationProvider(context),
    singleCase: CasesSingleViewServiceProvider(context),
    testResources: CasesTestResourcesServiceProvider(context),
  };
}
