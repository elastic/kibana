/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PageId } from '../../../../../endpoint_app_types';

interface UserNavigatedToPage {
  readonly type: 'userNavigatedToPage';

  readonly payload: PageId;
}

export type RoutingAction = UserNavigatedToPage;
