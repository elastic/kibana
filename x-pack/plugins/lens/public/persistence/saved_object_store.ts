/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectAttributes, SavedObjectsClientContract } from 'kibana/public';
import { Query, Filter } from '../../../../../src/plugins/data/public';

export interface Document {
  savedObjectId?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  description?: string;
  expression: string | null;
  state: {
    datasourceMetaData: {
      filterableIndexPatterns: Array<{ id: string; title: string }>;
    };
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query;
    filters: Filter[];
  };
}

export const DOC_TYPE = 'lens';

export interface DocumentSaver {
  save: (vis: Document) => Promise<{ savedObjectId: string }>;
}

export interface DocumentLoader {
  load: (savedObjectId: string) => Promise<Document>;
}

export type SavedObjectStore = DocumentLoader & DocumentSaver;

export class SavedObjectIndexStore implements SavedObjectStore {
  private client: SavedObjectsClientContract;

  constructor(client: SavedObjectsClientContract) {
    this.client = client;
  }

  async save(vis: Document) {
    const { savedObjectId, type, ...rest } = vis;
    // TODO: SavedObjectAttributes should support this kind of object,
    // remove this workaround when SavedObjectAttributes is updated.
    const attributes = (rest as unknown) as SavedObjectAttributes;

    const result = await (savedObjectId
      ? this.safeUpdate(savedObjectId, attributes)
      : this.client.create(DOC_TYPE, attributes));

    return { ...vis, savedObjectId: result.id };
  }

  // As Lens is using an object to store its attributes, using the update API
  // will merge the new attribute object with the old one, not overwriting deleted
  // keys. As Lens is using objects as maps in various places, this is a problem because
  // deleted subtrees make it back into the object after a load.
  // This function fixes this by doing two updates - one to empty out the document setting
  // every key to null, and a second one to load the new content.
  private async safeUpdate(savedObjectId: string, attributes: SavedObjectAttributes) {
    const resetAttributes: SavedObjectAttributes = {};
    Object.keys(attributes).forEach((key) => {
      resetAttributes[key] = null;
    });
    return (
      await this.client.bulkUpdate([
        { type: DOC_TYPE, savedObjectId, attributes: resetAttributes },
        { type: DOC_TYPE, savedObjectId, attributes },
      ])
    ).savedObjects[1];
  }

  async load(savedObjectId: string): Promise<Document> {
    const { type, attributes, error } = await this.client.get(DOC_TYPE, savedObjectId);

    if (error) {
      throw error;
    }

    return {
      ...(attributes as SavedObjectAttributes),
      savedObjectId,
      type,
    } as Document;
  }
}
