/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectAttributes,
  SavedObjectsClientContract,
  SavedObjectReference,
} from 'kibana/public';
import { Query } from '../../../../../src/plugins/data/public';
import { DOC_TYPE, PersistableFilter } from '../../common';

export interface Document {
  savedObjectId?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  description?: string;
  state: {
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query;
    globalPalette?: {
      activePaletteId: string;
      state?: unknown;
    };
    filters: PersistableFilter[];
  };
  references: SavedObjectReference[];
}

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

  save = async (vis: Document) => {
    const { savedObjectId, type, references, ...rest } = vis;
    // TODO: SavedObjectAttributes should support this kind of object,
    // remove this workaround when SavedObjectAttributes is updated.
    const attributes = (rest as unknown) as SavedObjectAttributes;

    const result = await (savedObjectId
      ? this.safeUpdate(savedObjectId, attributes, references)
      : this.client.create(DOC_TYPE, attributes, {
          references,
        }));

    return { ...vis, savedObjectId: result.id };
  };

  // As Lens is using an object to store its attributes, using the update API
  // will merge the new attribute object with the old one, not overwriting deleted
  // keys. As Lens is using objects as maps in various places, this is a problem because
  // deleted subtrees make it back into the object after a load.
  // This function fixes this by doing two updates - one to empty out the document setting
  // every key to null, and a second one to load the new content.
  private async safeUpdate(
    savedObjectId: string,
    attributes: SavedObjectAttributes,
    references: SavedObjectReference[]
  ) {
    const resetAttributes: SavedObjectAttributes = {};
    Object.keys(attributes).forEach((key) => {
      resetAttributes[key] = null;
    });
    return (
      await this.client.bulkUpdate([
        { type: DOC_TYPE, id: savedObjectId, attributes: resetAttributes, references },
        { type: DOC_TYPE, id: savedObjectId, attributes, references },
      ])
    ).savedObjects[1];
  }

  async load(savedObjectId: string): Promise<Document> {
    const { type, attributes, references, error } = await this.client.get(DOC_TYPE, savedObjectId);

    if (error) {
      throw error;
    }

    return {
      ...(attributes as SavedObjectAttributes),
      references,
      savedObjectId,
      type,
    } as Document;
  }
}
