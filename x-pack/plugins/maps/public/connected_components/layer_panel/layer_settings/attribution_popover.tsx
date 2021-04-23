/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ILayer } from '../../../classes/layers/layer';

interface Props {
  onChange: (attribution: Attribution) => void;
  popoverButtonLabel: string;
  popoverButtonIcon: string;
  label: string;
  url: string;
}

interface State {
  isPopoverOpen: boolean;
  label: string;
  url: string;
}

export class AttributionPopover extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    label: this.props.label,
    url: this.props.url,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onApply = () => {
    this.props.onChange({
      label: this.state.label,
      url: this.state.url,
    });
    this._closePopover();
  };

  _onLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ label: event.target.value });
  };

  _onUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.setState({ url: event.target.value });
  };

  _renderPopoverButton() {
    return (
      <EuiButtonEmpty
        onClick={this._togglePopover}
        size="xs"
        iconType={this.props.popoverButtonIcon}
      >
        {this.props.popoverButtonLabel}
      </EuiButtonEmpty>
    );
  }

  _renderContent() {
    const isComplete = this.state.label.length !== 0 && this.state.url.length !== 0;
    const hasChanges =
      (this.state.label.length !== 0 && this.state.label !== this.props.label) ||
      (this.state.url.length !== 0 && this.state.url !== this.props.url);
    return (
      <div className="mapAttributionPopover">
        <EuiPopoverTitle>
          <FormattedMessage
            id="xpack.maps.attribution.attributionFormLabel"
            defaultMessage="Attribution"
          />
        </EuiPopoverTitle>
        <EuiFormRow
          label={i18n.translate('xpack.maps.attribution.labelFieldLabel', {
            defaultMessage: 'Label',
          })}
          fullWidth
        >
          <EuiFieldText fullWidth value={this.state.label} onChange={this._onLabelChange} />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.maps.attribution.urlLabel', {
            defaultMessage: 'Link',
          })}
          fullWidth
        >
          <EuiFieldText fullWidth value={this.state.url} onChange={this._onUrlChange} />
        </EuiFormRow>
        <EuiSpacer size="xs" />
        <EuiPopoverFooter>
          <EuiTextAlign textAlign="right">
            <EuiButton
              fill
              isDisabled={!isComplete || !hasChanges}
              onClick={this._onApply}
              size="s"
            >
              <FormattedMessage id="xpack.maps.attribution.applyBtnLabel" defaultMessage="Apply" />
            </EuiButton>
          </EuiTextAlign>
        </EuiPopoverFooter>
      </div>
    );
  }

  render() {
    return (
      <EuiPopover
        id="attributionPopover"
        anchorPosition="leftCenter"
        button={this._renderPopoverButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
      >
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
