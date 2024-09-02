/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEntityDefinitionRoute } from './create';
import { deleteEntityDefinitionRoute } from './delete';
import { getEntityDefinitionRoute } from './get';
import { resetEntityDefinitionRoute } from './reset';
import { updateEntityDefinitionRoute } from './update';

export const entitiesRoutes = {
  ...createEntityDefinitionRoute,
  ...deleteEntityDefinitionRoute,
  ...getEntityDefinitionRoute,
  ...resetEntityDefinitionRoute,
  ...updateEntityDefinitionRoute,
};
