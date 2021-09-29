/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiButton,
  EuiFormControlLayout,
  EuiFieldText,
  EuiPopover,
  EuiPopoverTitle,
  EuiFocusTrap,
  keys,
  EuiSelectable,
} from '@elastic/eui';
import { SymbolIcon } from '../legend/symbol_icon';
import { getCustomIconId, SYMBOL_OPTIONS } from '../../symbol_utils';
import { getIsDarkMode } from '../../../../../kibana_services';
import { CustomIconModal } from './custom_icon_modal';
import { buildSrcUrl } from '../../symbol_utils';

function isKeyboardEvent(event) {
  return typeof event === 'object' && 'keyCode' in event;
}

export class IconSelect extends Component {
  state = {
    isPopoverOpen: false,
    isModalVisible: false,
  };

  _handleSave = (name, description, image) => {
    const symbolId = getCustomIconId();
    const icons = [
      ...this.props.customIcons,
      {
        symbolId,
        icon: image,
        name,
      },
    ];
    this.props.onCustomIconsChange(icons);
    this._hideModal();
  };

  _closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  _hideModal = () => {
    this.setState({ isModalVisible: false });
  };

  _openPopover = () => {
    this.setState({ isPopoverOpen: true });
  };

  _showModal = () => {
    this.setState({ isModalVisible: true });
  };

  _toggleModal = () => {
    this.setState((prevState) => ({
      isModalVisible: !prevState.isModalVisible,
    }));
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
      const { key, icon, label } = selectedOption;
      this.props.onChange({ selectedIconId: key, icon, label });
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
          value={this.props.label}
          compressed
          readOnly
          fullWidth
          prepend={
            <SymbolIcon
              key={this.props.key}
              className="mapIconSelectSymbol__inputButton"
              symbolId={this.props.key}
              fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            />
          }
        />
      </EuiFormControlLayout>
    );
  }

  _renderIconSelectable() {
    const makiOptions = [
      {
        label: 'Maki icons',
        isGroupLabel: true,
      },
      ...SYMBOL_OPTIONS.map(({ key, label }) => {
        return {
          key,
          label,
          prepend: (
            <SymbolIcon
              key={key}
              symbolId={key}
              fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
            />
          ),
        };
      }),
    ];

    const customOptions = this.props.customIcons.map(({ symbolId, icon, name }) => {
      return {
        key: symbolId,
        label: name,
        icon,
        prepend: (
          <SymbolIcon
            key={symbolId}
            symbolId={symbolId}
            svg={icon}
            fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
          />
        ),
      };
    });

    if (customOptions.length)
      customOptions.splice(0, 0, {
        label: 'Custom icons',
        isGroupLabel: true,
      });

    const options = [...customOptions, ...makiOptions];

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
      <Fragment>
        <EuiPopover
          ownFocus
          button={this._renderPopoverButton()}
          isOpen={this.state.isPopoverOpen}
          closePopover={this._closePopover}
          anchorPosition="downLeft"
          panelPaddingSize="s"
          display="block"
        >
          <EuiFocusTrap clickOutsideDisables={true}>
            {this._renderIconSelectable()}
            <EuiButton fullWidth onClick={this._toggleModal}>
              Add custom icon
            </EuiButton>
          </EuiFocusTrap>
        </EuiPopover>
        {this.state.isModalVisible ? (
          <CustomIconModal
            title="Custom Icon"
            onSave={this._handleSave}
            onCancel={this._hideModal}
          />
        ) : null}
      </Fragment>
    );
  }
}
