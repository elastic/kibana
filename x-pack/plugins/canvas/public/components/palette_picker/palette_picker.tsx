/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactElement } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { map } from 'lodash';
import { PopoverAnchorPosition } from '@elastic/eui';
import { Popover } from '../popover';
import { PaletteSwatch } from '../palette_swatch';
import { palettes, Palette } from '../../../common/lib/palettes';

interface Props {
  onChange?: (palette: Palette | null) => void;
  palette: Palette | null;
  anchorPosition?: PopoverAnchorPosition;
  ariaLabel: string;
  clearable?: boolean;
}

export const PalettePicker: FC<Props> = ({
  onChange = () => {},
  palette,
  anchorPosition = 'downCenter',
  ariaLabel,
  clearable = false,
}) => {
  const button = (handleClick: React.MouseEventHandler<HTMLButtonElement>) => (
    <button aria-label={ariaLabel} style={{ width: '100%', height: 16 }} onClick={handleClick}>
      <PaletteSwatch palette={palette} />
    </button>
  );

  let clear: ReactElement | null = null;

  if (clearable) {
    clear = (
      <button
        key="clear"
        onClick={() => onChange(null)}
        className="canvasPalettePicker__swatch"
        style={{ width: '100%' }}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={1}>
            <span className="canvasPalettePicker__label">None</span>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <PaletteSwatch />
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>
    );
  }

  return (
    <Popover
      id="palette-picker-popover"
      button={button}
      anchorPosition={anchorPosition}
      panelClassName="canvasPalettePicker__swatchesPanel"
      className="canvasPalettePicker__swatchesPopover"
      anchorClassName="canvasPalettePicker__swatchesPopoverAnchor"
    >
      {() => (
        <div className="canvas canvasPalettePicker__swatches">
          {clear}
          {map(palettes, (item) => (
            <button
              key={item.id}
              onClick={() => onChange(item)}
              className="canvasPalettePicker__swatch"
              style={{ width: '100%' }}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={1}>
                  <span className="canvasPalettePicker__label">{item.label}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <PaletteSwatch palette={item} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
};

PalettePicker.propTypes = {
  palette: PropTypes.object,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
  ariaLabel: PropTypes.string,
};
