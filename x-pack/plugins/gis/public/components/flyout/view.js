/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiTitle,
  EuiTextColor,
} from '@elastic/eui';


export class FlyOut extends React.Component {

  constructor() {
    super();
  }

  componentDidMount() {
  }

  _renderFlyout() {
    return (
      <EuiFlyout onClose={this.props.onClose} style={{ maxWidth: 768 }}>
        <EuiFlyoutHeader>
          <EuiTitle size="l">
            <h2>Add layer</h2>
          </EuiTitle>
          <EuiSpacer size="m"/>
          <EuiTextColor color="subdued">
            <EuiText size="s">
              <p>Choose a source from one of the following options, then click Add to map to continue.</p>
            </EuiText>
          </EuiTextColor>
          <EuiSpacer/>
          <EuiHorizontalRule margin="none"/>
        </EuiFlyoutHeader>

        <EuiFlyoutBody style={{ paddingTop: 0 }}>
          todo
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={this.props.closeFlyout}
                flush="left"
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/*{addToMapBtn}*/}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  render() {
    const { flyoutVisible } = this.props;
    return (flyoutVisible ? this._renderFlyout() : null);
  }
}

export default FlyOut;
