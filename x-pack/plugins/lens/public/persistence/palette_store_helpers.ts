/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PaletteOutput } from 'src/plugins/charts/public';
import type { CustomPaletteParams } from '../../common';
import { SavedObjectPaletteStore } from './saved_palette_store';

export const getPalettesFromStore = (
  paletteStore: SavedObjectPaletteStore,
  paletteType?: string
): Promise<Array<PaletteOutput<CustomPaletteParams>>> => {
  return paletteStore.getAll(paletteType).then((response) => {
    return response.savedObjects.map((palette) => {
      const attributes = palette.attributes as PaletteOutput<CustomPaletteParams>;
      return {
        type: palette.type,
        name: attributes.name,
        params: attributes.params,
      };
    }) as Array<PaletteOutput<CustomPaletteParams>>;
  });
};

export const savePaletteToStore = (
  paletteStore: SavedObjectPaletteStore,
  palette: PaletteOutput<CustomPaletteParams>,
  title: string,
  paletteType?: string
) => {
  const paletteToSave = {
    ...palette,
    title,
    params: {
      ...palette.params,
      title,
      paletteType,
    },
  };
  return paletteStore
    .save(paletteToSave)
    .then((response) => {
      return {
        type: response.type,
        name: response.name,
        params: response.params,
      } as PaletteOutput<CustomPaletteParams>;
    })
    .catch((error) => {
      throw new Error(`${error}`);
    });
};
