/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudStart } from '@kbn/cloud-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { useKibana as useKibanaBase } from '@kbn/kibana-react-plugin/public';
import { AuthenticatedUser } from '@kbn/security-plugin/common';

export interface ServerlessSearchContext {
  cloud: CloudStart;
  history: AppMountParameters['history'];
  share: SharePluginStart;
  user?: AuthenticatedUser;
}

type ServerlessSearchKibanaContext = CoreStart & ServerlessSearchContext;

export const useKibanaServices = () => useKibanaBase<ServerlessSearchKibanaContext>().services;
