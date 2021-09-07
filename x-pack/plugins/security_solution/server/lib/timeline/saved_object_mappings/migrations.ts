/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectMigrationMap,
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from 'kibana/server';
import { CreateTimelineSchema } from '../schemas/timelines';
import { defaultDataViewRef } from '../../../../common/constants';

// TODO: Steph/sourcerer write migration tests
export const migrations: SavedObjectMigrationMap = {
  '7.16.0': (
    doc: SavedObjectUnsanitizedDoc<CreateTimelineSchema>
  ): SavedObjectSanitizedDoc<CreateTimelineSchema> => {
    let foundDataView = false;
    const references: SavedObjectReference[] = (doc.references || []).map((t) => {
      // this is very unlikely to be set, but if it is we need to overwrite
      // to have correct indexNames association
      if (t.type === defaultDataViewRef.type) {
        foundDataView = true;
        return defaultDataViewRef;
      }
      return t;
    });
    if (!foundDataView) {
      references.push(defaultDataViewRef);
    }
    return {
      ...doc,
      references,
    };
  },
};
