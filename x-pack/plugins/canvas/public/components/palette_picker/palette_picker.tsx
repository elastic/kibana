/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { map } from 'lodash';
import { PopoverAnchorPosition } from '@elastic/eui';
import { Popover } from '../popover';
import { PaletteSwatch } from '../palette_swatch';
import { palettes, Palette } from '../../../common/lib/palettes';

interface Props {
  onChange?: (palette: Palette) => void;
  palette: Palette;
  anchorPosition?: PopoverAnchorPosition;
  ariaLabel: string;
}

export const PalettePicker: FC<Props> = ({
  onChange = () => {},
  palette,
  anchorPosition = 'downCenter',
  ariaLabel,
}) => {
  const button = (handleClick: React.MouseEventHandler<HTMLButtonElement>) => (
    <button aria-label={ariaLabel} style={{ width: '100%', height: 16 }} onClick={handleClick}>
      <PaletteSwatch palette={palette} />
    </button>
  );

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
          {map(palettes, (item) => (
            <button
              key={item.label}
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
