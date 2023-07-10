/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Params } from 'react-router-dom-v5-compat';

export { WorkpadRouteComponent, ExportWorkpadRouteComponent } from './workpad_route';
export type { WorkpadRoutingContextType } from './workpad_routing_context';
export { WorkpadRoutingContext } from './workpad_routing_context';

export type WorkpadRouteParams = Params<'id' | 'pageNumber'>;
