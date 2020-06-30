/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiFormControlLayout,
  EuiFieldText,
  EuiPopover,
  EuiPopoverTitle,
  EuiFocusTrap,
  keyCodes,
  EuiSelectable,
} from '@elastic/eui';
import { SymbolIcon } from '../legend/symbol_icon';

function isKeyboardEvent(event) {
  return typeof event === 'object' && 'keyCode' in event;
}

export class IconSelect extends Component {
  state = {
    isPopoverOpen: false,
  };

  _closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  _openPopover = () => {
    this.setState({ isPopoverOpen: true });
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _handleKeyboardActivity = (e) => {
    if (isKeyboardEvent(e)) {
      if (e.keyCode === keyCodes.ENTER) {
        e.preventDefault();
        this._togglePopover();
      } else if (e.keyCode === keyCodes.DOWN) {
        this._openPopover();
      }
    }
  };

  _onIconSelect = (options) => {
    const selectedOption = options.find((option) => {
      return option.checked === 'on';
    });

    if (selectedOption) {
      this.props.onChange(selectedOption.value);
    }
    this._closePopover();
  };

  _renderPopoverButton() {
    const { isDarkMode, value } = this.props;
    return (
      <EuiFormControlLayout
        icon={{ type: 'arrowDown', side: 'right' }}
        readOnly
        fullWidth
        compressed
        onKeyDown={this._handleKeyboardActivity}
        append={this.props.append}
      >
        <EuiFieldText
          onClick={this._togglePopover}
          onKeyDown={this._handleKeyboardActivity}
          value={value}
          compressed
          readOnly
          fullWidth
          prepend={
            <SymbolIcon
              key={value}
              className="mapIconSelectSymbol__inputButton"
              symbolId={value}
              fill={isDarkMode ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            />
          }
        />
      </EuiFormControlLayout>
    );
  }

  _renderIconSelectable() {
    const { isDarkMode } = this.props;
    const options = this.props.symbolOptions.map(({ value, label }) => {
      return {
        value,
        label,
        prepend: (
          <SymbolIcon
            key={value}
            symbolId={value}
            fill={isDarkMode ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
          />
        ),
      };
    });

    return (
      <EuiSelectable searchable options={options} onChange={this._onIconSelect}>
        {(list, search) => (
          <div style={{ width: '300px' }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    );
  }

  render() {
    return (
      <EuiPopover
        ownFocus
        button={this._renderPopoverButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        anchorPosition="downLeft"
        panelPaddingSize="s"
        display="block"
      >
        <EuiFocusTrap clickOutsideDisables={true}>{this._renderIconSelectable()}</EuiFocusTrap>
      </EuiPopover>
    );
  }
}
