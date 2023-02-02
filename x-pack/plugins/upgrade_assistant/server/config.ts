/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

// -------------------------------
// >= 8.6 UA is always enabled to guide stack upgrades
// even for minor releases.
// -------------------------------
const configSchema = schema.object({
  featureSet: schema.object({
    /**
     * Ml Snapshot should only be enabled for major version upgrades. Currently this
     * is manually set to `true` on every `x.last` version.
     * ML Upgrade mode can be toggled from outside Kibana, the purpose
     * of this feature guard is to hide all ML related deprecations from the end user
     * until the next major upgrade.
     *
     * When we want to enable ML model snapshot deprecation warnings again we need
     * to change the constant `MachineLearningField.MIN_CHECKED_SUPPORTED_SNAPSHOT_VERSION`
     * to something higher than 7.0.0 in the Elasticsearch code.
     */
    mlSnapshots: schema.boolean({ defaultValue: false }),
    /**
     * Migrating system indices should only be enabled for major version upgrades.
     * Currently this is manually set to `true` on every `x.last` version.
     */
    migrateSystemIndices: schema.boolean({ defaultValue: false }),
    /**
     * Deprecations with reindexing corrective actions are only enabled for major version upgrades.
     * Currently this is manually set to `true` on every `x.last` version.
     *
     * The reindex action includes some logic that is specific to the 8.0 upgrade
     * End users could get into a bad situation if this is enabled before this logic is fixed.
     */
    reindexCorrectiveActions: schema.boolean({ defaultValue: false }),
  }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type UpgradeAssistantConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<UpgradeAssistantConfig> = {
  exposeToBrowser: {
    ui: true,
    featureSet: true,
  },
  schema: configSchema,
  deprecations: () => [],
};
