/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HasType } from '@kbn/presentation-publishing';
import { DOC_TYPE } from '../../common/constants';
import { HasLensConfig, ViewUnderlyingDataArgs } from '../embeddable';

export type OpenInDiscoverActionApi = HasType<typeof DOC_TYPE> &
  HasLensConfig & {
    canViewUnderlyingData: () => Promise<boolean>;
    getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs;
  };
