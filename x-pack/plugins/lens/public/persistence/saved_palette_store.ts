/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectAttributes,
  SavedObjectsClientContract,
  ResolvedSimpleSavedObject,
} from 'kibana/public';
import { PALETTE_DOC_TYPE } from '../../common';

export interface PaletteDocument {
  savedObjectId?: string;
  name?: string;
  type?: string;
  title: string;
  params?: unknown;
}

export interface PaletteSaver {
  save: (palette: PaletteDocument) => Promise<{ savedObjectId: string }>;
}

export interface PaletteLoader {
  load: (savedObjectId: string) => Promise<ResolvedSimpleSavedObject>;
}

export type SavedPaletteStore = PaletteLoader & PaletteSaver;

export class SavedObjectPaletteStore implements SavedPaletteStore {
  private client: SavedObjectsClientContract;

  constructor(client: SavedObjectsClientContract) {
    this.client = client;
  }

  save = async (palette: PaletteDocument) => {
    const { type, ...rest } = palette;
    // TODO: SavedObjectAttributes should support this kind of object,
    // remove this workaround when SavedObjectAttributes is updated.
    const attributes = rest as unknown as SavedObjectAttributes;

    const result = await this.client.create(PALETTE_DOC_TYPE, attributes, {
      overwrite: true,
    });

    return { ...palette, savedObjectId: result.id };
  };

  getAll = async () => {
    const resolveResult = await this.client.find({ type: PALETTE_DOC_TYPE });
    return resolveResult;
  };

  async load(savedObjectId: string): Promise<ResolvedSimpleSavedObject> {
    const resolveResult = await this.client.resolve(PALETTE_DOC_TYPE, savedObjectId);

    if (resolveResult.saved_object.error) {
      throw resolveResult.saved_object.error;
    }

    return resolveResult;
  }
}
