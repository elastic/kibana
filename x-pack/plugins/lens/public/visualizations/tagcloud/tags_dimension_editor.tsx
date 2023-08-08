/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PaletteRegistry } from '@kbn/coloring';
import type { TagcloudState } from './types';
import { PalettePicker } from '../../shared_components';

interface Props {
  paletteService: PaletteRegistry;
  state: TagcloudState;
  setState: (state: TagcloudState) => void;
}

export function TagsDimensionEditor(props: Props) {
  return (
    <PalettePicker
      palettes={props.paletteService}
      activePalette={props.state.palette}
      setPalette={(newPalette) => {
        props.setState({
          ...props.state,
          palette: newPalette,
        });
      }}
    />
  );
}
