/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
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


let idCounter = 0;

export class FlyOut extends React.Component {

  constructor() {
    super();
    this.state = {
      tmsInput: ''
    };
  }


  _renderFlexibleSelect = (options, selectAction) => {
    const onChange = ({ target }) => {
      const [source, id] = target.value.split(':');
      selectAction(source, +id);
    };

    return (
      <Fragment>
        <EuiSpacer size="m"/>
        <EuiSelect
          options={options}
          onChange={onChange}
          aria-label="Use aria labels when no actual label is in use"
        />
      </Fragment>
    );
  };


  _handleTMSInputChange(e) {
    this.setState({
      tmsInput: e.target.value,
      tmsCanPreview: (e.target.value.indexOf('{x}') >= 0 && e.target.value.indexOf('{y}') >= 0 && e.target.value.indexOf('{z}') >= 0)
    });
  }

  _addToMapBtn() {
    const { layerLoading, temporaryLayers, addAction } = this.props;
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

  _previewTMS() {
    if (!this.state.tmsInput) {
      return;
    }
    this.props.previewXYZLayer(this.state.tmsInput, this.state.tmsInput + (idCounter++).toString(), {});
  }

  _renderFlyout() {

    const { emsVectorOptions, selectAction, closeFlyout } = this.props;
    return (
      <EuiFlyout onClose={() => console.log('onClose todo')} style={{ maxWidth: 768 }}>
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
            <EuiSpacer size="l"/>
            <EuiAccordion
              id="accordion2"
              buttonContent="From Elastic Maps Service"
              paddingSize="l"
            >
              <EuiText>
                {this._renderFlexibleSelect(emsVectorOptions, selectAction)}
              </EuiText>
            </EuiAccordion>
          </div>
          <div>
            <EuiSpacer size="l"/>
            <EuiAccordion
              id="accordion2"
              buttonContent="Tilemap service with XYZ url"
              paddingSize="l"
            >
              <Fragment>
                <EuiFieldText
                  placeholder="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  onChange={(e) => this._handleTMSInputChange(e)}
                  aria-label="Use aria labels when no actual label is in use"
                />
                <EuiButton
                  size="s"
                  onClick={(e) => this._previewTMS(e)}
                  isDisabled={!this.state.tmsCanPreview}
                >
                  {this.state.tmsCanPreview ? "Preview on Map" : "Enter URL with {x}/{y}/{x} pattern." }
                </EuiButton>
              </Fragment>
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
