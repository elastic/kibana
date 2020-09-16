/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectUnsanitizedDoc, SavedObjectSanitizedDoc } from '../../../../../src/core/server';

interface UnsanitizedCase {
  connector_id: string;
}

interface SanitizedCase {
  connector: {
    id: string;
    name: string;
    type: string;
  };
}

export const migrations = {
  '7.10.0': (
    doc: SavedObjectUnsanitizedDoc<UnsanitizedCase>
  ): SavedObjectSanitizedDoc<SanitizedCase> => {
    const { connector_id, ...attributesWithoutConnectorId } = doc.attributes;

    return {
      ...doc,
      attributes: {
        ...attributesWithoutConnectorId,
        connector: { id: connector_id, name: '', type: '' },
      },
      references: doc.references || [],
    };
  },
};
