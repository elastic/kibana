/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import {
  DataProvider,
  DataProviderId,
} from '../../../components/timeline/data_providers/data_provider';

const actionCreator = actionCreatorFactory('x-pack/secops/local/drag_and_drop');

export const registerProvider = actionCreator<{ provider: DataProvider }>('REGISTER_PROVIDER');

export const unRegisterProvider = actionCreator<{ id: DataProviderId }>('UNREGISTER_PROVIDER');

export const noProviderFound = actionCreator<{ id: DataProviderId }>('NO_PROVIDER_FOUND');
