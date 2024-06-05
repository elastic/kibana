/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import type { IntegrationAssistantPluginStartDependencies } from '../../types';

export type CreateIntegrationServices = CoreStart & IntegrationAssistantPluginStartDependencies;

export type CreateIntegrationComponent = React.ComponentType;
