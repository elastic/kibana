/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, flow } from 'lodash';
import type { SavedObjectMigrationFn } from 'kibana/server';

const v716RemoveUnusedTelemetry: SavedObjectMigrationFn<any, any> = (doc) => {
  // Dynamically defined in 6.7 (https://github.com/elastic/kibana/pull/28878)
  // and then statically defined in 7.8 (https://github.com/elastic/kibana/pull/64332).
  const attributesBlocklist = [
    'ui_open.overview',
    'ui_open.cluster',
    'ui_open.indices',
    'ui_reindex.close',
    'ui_reindex.open',
    'ui_reindex.start',
    'ui_reindex.stop',
  ];

  try {
    return {
      ...doc,
      attributes: {
        ...omit(doc.attributes, attributesBlocklist),
      },
    };
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
  }
  return doc;
};

export const telemetrySavedObjectMigrations = {
  '7.16.0': flow(v716RemoveUnusedTelemetry),
};
