/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServerlessProjectType } from '@kbn/es';
import type { GenericFtrProviderContext } from '@kbn/test';
import type { services } from '../../api_integration/services';
import type { pageObjects } from '../../functional/page_objects';

export type InheritedFtrProviderContext = GenericFtrProviderContext<
  typeof services,
  typeof pageObjects
>;

export type InheritedServices = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  infer TPageObjects
>
  ? TServices
  : {};

export type InheritedPageObjects = InheritedFtrProviderContext extends GenericFtrProviderContext<
  infer TServices,
  infer TPageObjects
>
  ? TPageObjects
  : {};

export interface CreateTestConfigOptions<
  TServices extends {} = InheritedServices,
  TPageObjects extends {} = InheritedPageObjects
> {
  serverlessProject: ServerlessProjectType;
  esServerArgs?: string[];
  esServerlessOptions?: { uiam: boolean };
  kbnServerArgs?: string[];
  testFiles: string[];
  junit: { reportName: string };
  suiteTags?: { include?: string[]; exclude?: string[] };
  services?: TServices;
  pageObjects?: TPageObjects;
  apps?: Record<string, { pathname: string; hash?: string }>;
  screenshots?: { directory: string };
  indexRefreshInterval?: string | false;
  enableFleetDockerRegistry?: boolean;
}
