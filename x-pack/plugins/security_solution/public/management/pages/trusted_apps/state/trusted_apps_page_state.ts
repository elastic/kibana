/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { ListViewState } from './list_view_state';

export interface TrustedAppsPageState {
  list: ListViewState<TrustedApp>;
  active: boolean;
}
