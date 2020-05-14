/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { map } from 'lodash';
import { Popover } from '../popover';
import { PaletteSwatch } from '../palette_swatch';
import { palettes } from '../../../common/lib/palettes';

export const PalettePicker = ({ onChange, value, anchorPosition, ariaLabel }) => {
  const button = handleClick => (
    <button aria-label={ariaLabel} style={{ width: '100%', height: 16 }} onClick={handleClick}>
      <PaletteSwatch colors={value.colors} gradient={value.gradient} />
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
          {map(palettes, (palette, name) => (
            <button
              key={name}
              onClick={() => onChange(palette)}
              className="canvasPalettePicker__swatch"
              style={{ width: '100%' }}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={1}>
                  <span className="canvasPalettePicker__label">{name.replace(/_/g, ' ')}</span>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <PaletteSwatch colors={palette.colors} gradient={palette.gradient} />
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
  value: PropTypes.object,
  onChange: PropTypes.func,
  anchorPosition: PropTypes.string,
};
