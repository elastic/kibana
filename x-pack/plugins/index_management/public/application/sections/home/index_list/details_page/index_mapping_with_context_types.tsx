/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { ExtensionsService } from '../../../../../services';
import { AppDependencies } from '../../../../app_context';

// duplicating this Index interface here so we don't blow up the bundle by importing all the types
interface Index {
  name: string;
  primary?: number | string;
  replica?: number | string;
  isFrozen: boolean;
  hidden: boolean;
  aliases: string | string[];
  data_stream?: string;

  // The types below are added by extension services if corresponding plugins are enabled (ILM, Rollup, CCR)
  isRollupIndex?: boolean;
  isFollowerIndex?: boolean;

  // The types from here below represent information returned from the index stats API;
  // treated optional as the stats API is not available on serverless
  documents?: number;
  size?: string;
  primary_size?: string;
  documents_deleted?: number;
}

export interface IndexMappingProps {
  index?: Index;
  showAboutMappings?: boolean;
}

export type IndexMappingWithContextProps = {
  core: CoreStart;
  // omitting services here to constitute them inside the component
  // this helps reduce bundle size significantly
  dependencies: Omit<AppDependencies, 'services'> & {
    services: { extensionsService: ExtensionsService };
  };
} & IndexMappingProps;
