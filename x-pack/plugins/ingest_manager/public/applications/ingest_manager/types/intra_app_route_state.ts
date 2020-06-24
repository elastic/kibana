/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApplicationStart } from 'kibana/public';
import { Datasource } from '../../../../common/types/models';

/**
 * Supported routing state for the create datasource page routes
 */
export interface CreateDatasourceRouteState {
  /** On a successful save of the datasource, use navigate to the given app */
  onSaveNavigateTo?:
    | Parameters<ApplicationStart['navigateToApp']>
    | ((newDatasource: Datasource) => Parameters<ApplicationStart['navigateToApp']>);
  /** On cancel, navigate to the given app */
  onCancelNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
  /** Url to be used on cancel links */
  onCancelUrl?: string;
}

/**
 * All possible Route states.
 */
export type AnyIntraAppRouteState = CreateDatasourceRouteState;
