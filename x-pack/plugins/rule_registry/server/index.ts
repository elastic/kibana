/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from 'src/core/server';
import { RuleRegistryPlugin } from './plugin';

export { RuleRegistryPluginSetupContract } from './plugin';
export { createLifecycleRuleTypeFactory } from './rule_registry/rule_type_helpers/create_lifecycle_rule_type_factory';
export { createPersistenceRuleTypeFactory } from './rule_registry/rule_type_helpers/create_persistence_rule_type_factory';
export { ecsFieldMap } from './generated/ecs_field_map';
export { DefaultFieldMap } from './rule_registry/defaults/field_map';
export { pickWithPatterns } from './rule_registry/field_map/pick_with_patterns';
export { OutputOfFieldMap } from './rule_registry/field_map/runtime_type_from_fieldmap';
export { FieldMapOf } from './types';
export { ScopedRuleRegistryClient } from './rule_registry/create_scoped_rule_registry_client/types';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    unsafe: schema.object({
      write: schema.object({ enabled: schema.boolean({ defaultValue: false }) }),
    }),
  }),
};

export type RuleRegistryConfig = TypeOf<typeof config.schema>;

export const plugin = (initContext: PluginInitializerContext) =>
  new RuleRegistryPlugin(initContext);
