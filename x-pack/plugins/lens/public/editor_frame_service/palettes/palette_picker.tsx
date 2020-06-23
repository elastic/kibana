/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import { FramePublicAPI } from '../../types';
import { palettes } from './palettes';
import { NativeRenderer } from '../../native_renderer';

export function PalettePicker({ frame }: { frame: FramePublicAPI }) {
  return (
    <>
      <EuiSuperSelect
        className="lensPalettePicker__swatchesPopover"
        valueOfSelected={frame.globalPalette.colorFunction.id || 'eui'}
        options={Object.entries(palettes).map(([id, palette]) => ({
          value: id,
          inputDisplay: (
            <div className="lensPalettePicker__swatch" style={{ width: '100%' }}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={1}>
                  <span className="lensPalettePicker__label">{palette.title}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <NativeRenderer
                    render={palette.renderPreview}
                    nativeProps={{ state: palette.state }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          ),
        }))}
        onChange={(value) => {
          frame.globalPalette.setColorFunction(value);
        }}
      />
      {frame.globalPalette.colorFunction.renderEditor && (
        <NativeRenderer
          render={frame.globalPalette.colorFunction.renderEditor}
          nativeProps={{
            state: frame.globalPalette.state,
            setState: frame.globalPalette.setState,
          }}
        />
      )}
    </>
  );
}
