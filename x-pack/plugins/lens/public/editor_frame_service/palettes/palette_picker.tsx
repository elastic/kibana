/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiColorPalettePicker } from '@elastic/eui';
import { FramePublicAPI } from '../../types';
import { NativeRenderer } from '../../native_renderer';

export function PalettePicker({ frame }: { frame: FramePublicAPI }) {
  return (
    <>
      <EuiColorPalettePicker
        palettes={Object.entries(frame.globalPalette.availablePalettes).map(([id, palette]) => {
          return {
            value: id,
            title: palette.title,
            type: 'fixed',
            palette: palette.getPreview(frame.globalPalette.state).colors,
          };
        })}
        onChange={frame.globalPalette.setActivePalette}
        valueOfSelected={frame.globalPalette.activePalette.id || 'default'}
        selectionDisplay={'palette'}
      />
      {frame.globalPalette.activePalette.renderEditor && (
        <NativeRenderer
          render={frame.globalPalette.activePalette.renderEditor}
          nativeProps={{
            state: frame.globalPalette.state,
            setState: frame.globalPalette.setState,
          }}
        />
      )}
    </>
  );
}
