/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { IScopedClusterClient } from '@kbn/core/server';

/**
 * Options for the server-side {@link GlobalSearchPluginStart.find | find API}
 */
export interface GlobalSearchFindOptions {
  /**
   * A custom preference token associated with a search 'session' that should be used to get consistent scoring
   * when performing calls to ES. Can also be used as a 'session' token for providers returning data from elsewhere
   * than an elasticsearch cluster.
   *
   * If not specified, a random token will be generated and used. The token is stored in the sessionStorage and is guaranteed
   * to be consistent during a given http 'session'
   */
  preference?: string;
  /**
   * Optional observable to notify that the associated `find` call should be canceled.
   * If/when provided and emitting, the result observable will be completed and no further result emission will be performed.
   */
  aborted$?: Observable<void>;
  /**
   * A ES client of type IScopedClusterClient is passed to the `find` call.
   * When performing calls to ES, the interested provider can utilize this parameter to identify the specific cluster.
   */
  client?: IScopedClusterClient;
}
