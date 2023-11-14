/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { registerRoute as registerFieldHistogramsRoute } from './api/field_histograms/register_route';
import { registerRoute as registerAuditMessagesRoute } from './api/audit_messages/register_route';
import { registerRoute as registerTransformsNodesRoute } from './api/transforms_nodes/register_route';
import { registerRoute as registerTransformsAllRoute } from './api/transforms_all/register_route';
import { registerRoute as registerTransformsSingleRoute } from './api/transforms_single/register_route';
import { registerRoute as registerTransformsStatsAllRoute } from './api/transforms_stats_all/register_route';
import { registerRoute as registerTransformsStatsSingleRoute } from './api/transforms_stats_single/register_route';
import { registerRoute as registerTransformsCreate } from './api/transforms_create/register_route';
import { registerRoute as registerTransformsUpdate } from './api/transforms_update/register_route';
import { registerRoute as registerReauthorizeTransformsUpdate } from './api/reauthorize_transforms/register_route';

export function registerRoutes(dependencies: RouteDependencies) {
  registerFieldHistogramsRoute(dependencies);
  registerAuditMessagesRoute(dependencies);
  registerTransformsNodesRoute(dependencies);
  registerTransformsAllRoute(dependencies);
  registerTransformsSingleRoute(dependencies);
  registerTransformsStatsAllRoute(dependencies);
  registerTransformsStatsSingleRoute(dependencies);
  registerTransformsCreate(dependencies);
  registerTransformsUpdate(dependencies);
  registerReauthorizeTransformsUpdate(dependencies);
}
