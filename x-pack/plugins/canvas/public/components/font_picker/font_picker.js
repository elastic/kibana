/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiLink } from '@elastic/eui';
import { fonts } from '@kbn/interpreter/common/lib/fonts';
import { Popover } from '../popover';
import { FauxSelect } from '../faux_select';

export const FontPicker = ({ onSelect, value, anchorPosition }) => {
  const selected = fonts.find(font => font.value === value) || { label: value, value };

  // TODO: replace faux select with better EUI custom select or dropdown when it becomes available
  const popoverButton = handleClick => (
    <FauxSelect handleClick={handleClick}>
      <div style={{ fontFamily: selected.value }}>{selected.label}</div>
    </FauxSelect>
  );

  return (
    <Popover
      id="font-picker-popover"
      className="canvasFontPicker__wrapper"
      button={popoverButton}
      panelClassName="canvasFontPicker__popover"
      anchorPosition={anchorPosition}
      panelPaddingSize="none"
    >
      {() => (
        <div className="canvasFontPicker">
          {fonts.map(font => (
            <EuiLink
              key={font.label}
              className="canvasFontPicker__font"
              style={{ fontFamily: font.value }}
              onClick={() => onSelect(font.value)}
            >
              {font.label}
            </EuiLink>
          ))}
        </div>
      )}
    </Popover>
  );
};

FontPicker.propTypes = {
  value: PropTypes.string,
  onSelect: PropTypes.func,
  anchorPosition: PropTypes.string,
};
