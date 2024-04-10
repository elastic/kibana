/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { IndexMappingProps } from '@kbn/index-management';
import { AppDependencies } from '../../../../app_context';
import { ExtensionsService } from '../../../../../services/extensions_service';

export type IndexMappingWithContextProps = {
  core: CoreStart;
  // omitting services here to constitute them inside the component
  // this helps reduce bundle size significantly
  dependencies: Omit<AppDependencies, 'services'> & {
    services: { extensionsService: ExtensionsService };
  };
} & IndexMappingProps;
