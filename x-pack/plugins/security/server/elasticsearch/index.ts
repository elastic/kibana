/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '../../common/model';

export type AuthenticationInfo = Omit<AuthenticatedUser, 'authentication_provider'>;
export {
  ElasticsearchService,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  OnlineStatusRetryScheduler,
} from './elasticsearch_service';
