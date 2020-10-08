/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Component, ReactElement } from 'react';
import { EuiButtonIcon, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type Props = {
  children: ReactElement<any>;
};

type State = {
  isPopoverOpen: boolean;
};

export class FieldMetaPopover extends Component<Props, State> {
  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _renderButton() {
    return (
      <EuiButtonIcon
        onClick={this._togglePopover}
        size="s"
        iconType="gear"
        aria-label={i18n.translate('xpack.maps.styles.fieldMetaOptions.popoverToggle', {
          defaultMessage: 'Field meta options popover toggle',
        })}
      />
    );
  }

  render() {
    return (
      <EuiPopover
        id="fieldMetaOptionsPopover"
        anchorPosition="leftCenter"
        button={this._renderButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
      >
        {this.props.children}
      </EuiPopover>
    );
  }
}
