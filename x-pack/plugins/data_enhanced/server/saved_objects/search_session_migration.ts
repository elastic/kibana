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
  SearchSessionSavedObjectAttributesPre$7$14$0,
  'completed'
>;

/**
 * In 7.14.0 a `version` field was added. When search session is created it is populated with current kibana version.
 * It is used to display warnings when trying to restore a session from a different version
 * For saved object created before 7.14.0 we populate "7.13.0" inside the migration.
 * It is less then ideal because the saved object could have actually been created in "7.12.x" or "7.13.x",
 * but what is important for 7.14.0 is that the version is less then "7.14.0"
 */
export type SearchSessionSavedObjectAttributesPre$7$14$0 = Omit<
  SearchSessionSavedObjectAttributesLatest,
  'version'
>;

export const searchSessionSavedObjectMigrations: SavedObjectMigrationMap = {
  '7.13.0': (
    doc: SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$13$0>
  ): SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$14$0> => {
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
  '7.14.0': (
    doc: SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesPre$7$14$0>
  ): SavedObjectUnsanitizedDoc<SearchSessionSavedObjectAttributesLatest> => {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        version: '7.13.0',
      },
    };
  },
};
