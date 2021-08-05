/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';

// Cloud has its own system for managing templates and we want to make
// this clear in the UI when a template is used in a Cloud deployment.
export const getCloudManagedTemplatePrefix = async (
  client: IScopedClusterClient
): Promise<string | undefined> => {
  try {
    const {
      body: { persistent, transient, defaults },
    } = await client.asCurrentUser.cluster.getSettings({
      filter_path: '*.*managed_index_templates',
      flat_settings: true,
      include_defaults: true,
    });

    const { 'cluster.metadata.managed_index_templates': managedTemplatesPrefix = undefined } = {
      ...defaults,
      ...persistent,
      ...transient,
    };
    return managedTemplatesPrefix;
  } catch (e) {
    // Silently swallow error and return undefined for the prefix
    // so that downstream calls are not blocked.
    return;
  }
};
