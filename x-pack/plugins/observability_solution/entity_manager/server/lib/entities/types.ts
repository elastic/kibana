/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';

// state is the *live* state of the definition. since a definition
// is composed of several elasticsearch components that can be
// modified or deleted outside of the entity manager apis, this can
// be used to verify the actual installation is complete and running
export type EntityDefinitionWithState = EntityDefinition & {
  state: { installed: boolean; running: boolean };
};
