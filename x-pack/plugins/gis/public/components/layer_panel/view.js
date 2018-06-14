/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlyout,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiText,
  EuiHorizontalRule,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';

export function LayerPanel({
  cancelLayerPanel,
  saveLayerEdits,
  selectedLayer
}) {
  return (
    <EuiFlyout onClose={cancelLayerPanel} style={{ maxWidth: 768 }}>
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2>{selectedLayer.getLayerName()}</h2>
        </EuiTitle>
        <EuiSpacer size="m"/>
        <EuiTextColor color="subdued">
          <EuiText size="s">
            <p className="layerSettings__type">{selectedLayer.renderSmallLegend()} {selectedLayer.getType()}</p>
          </EuiText>
        </EuiTextColor>
        <EuiSpacer />
        <EuiHorizontalRule margin="none"/>
      </EuiFlyoutHeader>

      <EuiFlyoutBody style={{ paddingTop: 0 }}>
        <EuiSpacer size="l"/>
        styling + analytics
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={cancelLayerPanel}
              flush="left"
            >
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="danger"
              onClick={() => this.props.removeLayer(selectedLayer)}
              flush="right"
            >
              Remove layer
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="check"
              onClick={saveLayerEdits}
              fill
            >
              Save &amp; Close
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
