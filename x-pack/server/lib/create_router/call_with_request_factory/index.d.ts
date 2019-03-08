/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import { Legacy } from 'kibana';
import { CallClusterWithRequest } from 'src/legacy/core_plugins/elasticsearch';

export type CallWithRequest = (...args: any[]) => CallClusterWithRequest;

export declare function callWithRequestFactory(
  server: Legacy.Server,
  request: Request
): CallWithRequest;
