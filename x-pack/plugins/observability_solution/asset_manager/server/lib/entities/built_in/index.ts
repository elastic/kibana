/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { adminConsoleServicesEntityDefinition } from './admin_console_services';

export const builtInEntityDefinitions: EntityDefinition[] = [adminConsoleServicesEntityDefinition];
