/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationMap, SavedObjectUnsanitizedDoc } from 'kibana/server';
import {
  SearchSessionSavedObjectAttributes as SearchSessionSavedObjectAttributesLatest,
  SearchSessionStatus,
} from '../../../../../src/plugins/data/common';

/**
 * Search sessions were released in 7.12.0
 * In 7.13.0 a `completed` field was added.
 * It is a timestamp representing the session was transitioned into "completed" status.
 */
export type SearchSessionSavedObjectAttributesPre$7$13$0 = Omit<
  SearchSessionSavedObjectAttributesLatest,
  'completed'
>;

export const searchSessionSavedObjectMigrations: SavedObjectMigrationMap = {
  '7.13.0': (
    doc: SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$13$0>
  ): SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesLatest> => {
    if (doc.attributes.status === SearchSessionStatus.COMPLETE) {
      return {
        ...doc,
        attributes: {
          ...doc.attributes,
          completed: doc.attributes.touched,
        },
      };
    }

    return doc;
  },
};
