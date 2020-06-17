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

interface RequiredProps {
  onChange?: (palette: Palette) => void;
  palette: Palette;
  anchorPosition?: PopoverAnchorPosition;
  ariaLabel: string;
  clearable?: false;
}

interface ClearableProps {
  onChange?: (palette: Palette | null) => void;
  palette: Palette | null;
  anchorPosition?: PopoverAnchorPosition;
  ariaLabel: string;
  clearable: true;
}

type Props = RequiredProps | ClearableProps;

export const PalettePicker: FC<Props> = (props) => {
  const { palette, anchorPosition = 'downCenter', ariaLabel } = props;

  const button = (handleClick: React.MouseEventHandler<HTMLButtonElement>) => (
    <button aria-label={ariaLabel} style={{ width: '100%', height: 16 }} onClick={handleClick}>
      <PaletteSwatch palette={palette} />
    </button>
  );

  let clear: ReactElement | null = null;

  if (props.clearable) {
    const { onChange = () => {} } = props;
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

  const { onChange = () => {} } = props;

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
  clearable: PropTypes.bool,
};
