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
  keys,
  EuiSelectable,
} from '@elastic/eui';
import { SymbolIcon } from '../legend/symbol_icon';
import { SYMBOL_OPTIONS } from '../../symbol_utils';
import { getIsDarkMode } from '../../../../../kibana_services';

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
      if (e.key === keys.ENTER) {
        e.preventDefault();
        this._togglePopover();
      } else if (e.key === keys.ARROW_DOWN) {
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
          value={this.props.value}
          compressed
          readOnly
          fullWidth
          prepend={
            <SymbolIcon
              key={this.props.value}
              className="mapIconSelectSymbol__inputButton"
              symbolId={this.props.value}
              fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            />
          }
        />
      </EuiFormControlLayout>
    );
  }

  _renderIconSelectable() {
    const options = SYMBOL_OPTIONS.map(({ value, label }) => {
      return {
        value,
        label,
        prepend: (
          <SymbolIcon
            key={value}
            symbolId={value}
            fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
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
