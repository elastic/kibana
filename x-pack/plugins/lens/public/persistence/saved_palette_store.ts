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
import { PALETTE_DOC_TYPE, CustomPaletteParams } from '../../common';

export interface PaletteDocument {
  savedObjectId?: string;
  title?: string;
  name?: string;
  type?: string;
  params?: CustomPaletteParams;
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
    const attributes = rest as CustomPaletteParams as SavedObjectAttributes;
    const duplicate = palette.title ? await this.checkForDuplicateTitle(palette.title) : false;

    if (duplicate) {
      throw new Error('A palette with this title already exists.');
    }

    const result = await this.client.create(PALETTE_DOC_TYPE, attributes, {
      overwrite: true,
    });

    return { ...palette, savedObjectId: result.id };
  };

  getAll = async (paletteType?: string) => {
    const resolveResult = await this.client.find({ type: PALETTE_DOC_TYPE, search: paletteType });
    return resolveResult;
  };

  checkForDuplicateTitle = async (title: string) => {
    const result = await this.client.find({
      type: PALETTE_DOC_TYPE,
      searchFields: ['title'],
      search: `"${title}"`,
    });

    return result.savedObjects.length > 0;
  };

  load = async (savedObjectId: string): Promise<ResolvedSimpleSavedObject> => {
    const resolveResult = await this.client.resolve(PALETTE_DOC_TYPE, savedObjectId);

    if (resolveResult.saved_object.error) {
      throw resolveResult.saved_object.error;
    }

    return resolveResult;
  };
}
