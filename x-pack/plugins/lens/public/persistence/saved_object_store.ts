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
import { PersistableFilter } from '../../common';

export interface Document {
  id?: string;
  type?: string;
  visualizationType: string | null;
  title: string;
  description?: string;
  state: {
    datasourceStates: Record<string, unknown>;
    visualization: unknown;
    query: Query;
    filters: PersistableFilter[];
  };
  references: SavedObjectReference[];
}

export const DOC_TYPE = 'lens';

export interface DocumentSaver {
  save: (vis: Document) => Promise<{ id: string }>;
}

export interface DocumentLoader {
  load: (id: string) => Promise<Document>;
}

export type SavedObjectStore = DocumentLoader & DocumentSaver;

export class SavedObjectIndexStore implements SavedObjectStore {
  private client: SavedObjectsClientContract;

  constructor(client: SavedObjectsClientContract) {
    this.client = client;
  }

  async save(vis: Document) {
    const { id, type, references, ...rest } = vis;
    // TODO: SavedObjectAttributes should support this kind of object,
    // remove this workaround when SavedObjectAttributes is updated.
    const attributes = (rest as unknown) as SavedObjectAttributes;

    const result = await (id
      ? this.safeUpdate(id, attributes, references)
      : this.client.create(DOC_TYPE, attributes, {
          references,
        }));

    return { ...vis, id: result.id };
  }

  // As Lens is using an object to store its attributes, using the update API
  // will merge the new attribute object with the old one, not overwriting deleted
  // keys. As Lens is using objects as maps in various places, this is a problem because
  // deleted subtrees make it back into the object after a load.
  // This function fixes this by doing two updates - one to empty out the document setting
  // every key to null, and a second one to load the new content.
  private async safeUpdate(
    id: string,
    attributes: SavedObjectAttributes,
    references: SavedObjectReference[]
  ) {
    const resetAttributes: SavedObjectAttributes = {};
    Object.keys(attributes).forEach((key) => {
      resetAttributes[key] = null;
    });
    return (
      await this.client.bulkUpdate([
        { type: DOC_TYPE, id, attributes: resetAttributes, references },
        { type: DOC_TYPE, id, attributes, references },
      ])
    ).savedObjects[1];
  }

  async load(id: string): Promise<Document> {
    const { type, attributes, references, error } = await this.client.get(DOC_TYPE, id);

    if (error) {
      throw error;
    }

    return {
      ...(attributes as SavedObjectAttributes),
      references,
      id,
      type,
    } as Document;
  }
}
