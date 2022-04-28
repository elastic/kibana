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
  EuiPopoverFooter,
  EuiFocusTrap,
  keys,
  EuiSelectable,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  DEFAULT_CUSTOM_ICON_CUTOFF,
  DEFAULT_CUSTOM_ICON_RADIUS,
} from '../../../../../../common/constants';
import { SymbolIcon } from '../legend/symbol_icon';
import { SYMBOL_OPTIONS } from '../../symbol_utils';
import { getIsDarkMode } from '../../../../../kibana_services';
import { CustomIconModal } from './custom_icon_modal';

function isKeyboardEvent(event) {
  return typeof event === 'object' && 'keyCode' in event;
}

export class IconSelect extends Component {
  state = {
    isPopoverOpen: false,
    isModalVisible: false,
  };

  _handleSave = ({ symbolId, svg, cutoff, radius, label }) => {
    const icons = [
      ...this.props.customIcons.filter((i) => {
        return i.symbolId !== symbolId;
      }),
      {
        symbolId,
        svg,
        label,
        cutoff,
        radius,
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
      const { key } = selectedOption;
      this.props.onChange({ selectedIconId: key });
    }
    this._closePopover();
  };

  _renderPopoverButton() {
    const { value, svg, label } = this.props.icon;
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
          value={label || value}
          compressed
          readOnly
          fullWidth
          prepend={
            <SymbolIcon
              key={value}
              className="mapIconSelectSymbol__inputButton"
              symbolId={value}
              svg={svg}
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
        label: i18n.translate('xpack.maps.styles.vector.iconSelect.kibanaIconsGroupLabel', {
          defaultMessage: 'Kibana icons',
        }),
        isGroupLabel: true,
      },
      ...SYMBOL_OPTIONS.map(({ value, label, svg }) => {
        return {
          key: value,
          label,
          prepend: (
            <SymbolIcon
              key={value}
              symbolId={value}
              fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
              svg={svg}
            />
          ),
        };
      }),
    ];

    const customOptions = this.props.customIcons.map(({ symbolId, label, svg }) => {
      return {
        key: symbolId,
        label,
        prepend: (
          <SymbolIcon
            key={symbolId}
            symbolId={symbolId}
            svg={svg}
            fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
          />
        ),
      };
    });

    if (customOptions.length)
      customOptions.splice(0, 0, {
        label: i18n.translate('xpack.maps.styles.vector.iconSelect.customIconsGroupLabel', {
          defaultMessage: 'Custom icons',
        }),
        isGroupLabel: true,
      });

    const options = [...customOptions, ...makiOptions];

    return (
      <EuiSelectable searchable options={options} onChange={this._onIconSelect} compressed={true}>
        {(list, search) => (
          <div style={{ width: '300px' }}>
            <EuiPopoverTitle>{search}</EuiPopoverTitle>
            {list}
            <EuiPopoverFooter>
              {' '}
              <EuiButton fullWidth size="s" onClick={this._toggleModal}>
                <FormattedMessage
                  id="xpack.maps.styles.vector.iconSelect.addCustomIconButtonLabel"
                  defaultMessage="Add custom icon"
                />
              </EuiButton>
            </EuiPopoverFooter>
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
          <EuiFocusTrap clickOutsideDisables={true}>{this._renderIconSelectable()}</EuiFocusTrap>
        </EuiPopover>
        {this.state.isModalVisible ? (
          <CustomIconModal
            title="Add custom Icon"
            cutoff={DEFAULT_CUSTOM_ICON_CUTOFF}
            radius={DEFAULT_CUSTOM_ICON_RADIUS}
            onSave={this._handleSave}
            onCancel={this._hideModal}
          />
        ) : null}
      </Fragment>
    );
  }
}
