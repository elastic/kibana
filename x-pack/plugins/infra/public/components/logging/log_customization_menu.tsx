/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';

import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';

interface LogCustomizationMenuState {
  isShown: boolean;
}

export class LogCustomizationMenu extends React.Component<{}, LogCustomizationMenuState> {
  public readonly state = {
    isShown: false,
  };

  public show = () => {
    this.setState({
      isShown: true,
    });
  };

  public hide = () => {
    this.setState({
      isShown: false,
    });
  };

  public toggleVisibility = () => {
    this.setState((state) => ({
      isShown: !state.isShown,
    }));
  };

  public render() {
    const { children } = this.props;
    const { isShown } = this.state;

    const menuButton = (
      <EuiButtonEmpty color="text" iconType="eye" onClick={this.toggleVisibility} size="xs">
        <FormattedMessage
          id="xpack.infra.logs.customizeLogs.customizeButtonLabel"
          defaultMessage="Customize"
        />
      </EuiButtonEmpty>
    );

    return (
      <EuiPopover
        id="customizePopover"
        button={menuButton}
        closePopover={this.hide}
        isOpen={isShown}
        anchorPosition="downRight"
        ownFocus
      >
        <CustomizationMenuContent>{children}</CustomizationMenuContent>
      </EuiPopover>
    );
  }
}

const CustomizationMenuContent = euiStyled.div`
  min-width: 200px;
`;
