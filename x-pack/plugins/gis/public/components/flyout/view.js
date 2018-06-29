/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiAccordion,
  EuiText,
  EuiSelect,
  EuiSpacer,
  EuiButton,
  EuiFlyout,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiHorizontalRule,
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

  _renderFlexibleSelect = (source, options, selectAction) => {
    const onChange = ({ target }) => selectAction(source, target.value);

    return (
      <Fragment>
        <EuiSpacer size="m" />
        <EuiSelect
          options={options}
          onChange={onChange}
          aria-label="Use aria labels when no actual label is in use"
        />
      </Fragment>
    );
  };

  _addToMapBtn() {
    const { layerLoading, temporaryLayers, addAction } = this.props;
    console.log(layerLoading, temporaryLayers);
    const addToMapBtnText = 'Add to map';
    return (
      <EuiButton
        style={{ width: '10rem' }}
        disabled={!temporaryLayers || layerLoading}
        isLoading={layerLoading}
        iconType={temporaryLayers && !layerLoading ? 'check' : undefined}
        onClick={() => addAction()}
        fill
      >
        {addToMapBtnText}
      </EuiButton>
    );
  }

  _renderFlyout() {
    const { emsVectorOptions, emsSourceName, selectAction, closeFlyout } = this.props;

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
          <div>
            <EuiSpacer size="l" />
            <EuiAccordion
              id="accordion2"
              buttonContent="Import from Elastic Maps Service"
              paddingSize="l"
            >
              <EuiText>
                { this._renderFlexibleSelect(emsSourceName, emsVectorOptions, selectAction) }
              </EuiText>
            </EuiAccordion>
          </div>
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={closeFlyout}
                flush="left"
              >
                Cancel
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {this._addToMapBtn()}
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
