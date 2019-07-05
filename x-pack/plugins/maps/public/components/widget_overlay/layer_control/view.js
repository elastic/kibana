/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonEmpty,
  EuiTitle,
} from '@elastic/eui';
import { LayerTOC } from './layer_toc';
import { FormattedMessage } from '@kbn/i18n/react';

export function LayerControl({ showAddLayerWizard }) {
  const addLayer = (
    <EuiFlexItem grow={false}>
      <EuiButtonEmpty
        size="xs"
        flush="right"
        onClick={showAddLayerWizard}
        data-test-subj="addLayerButton"
      >
        <FormattedMessage
          id="xpack.maps.layerControl.addLayerButtonLabel"
          defaultMessage="Add layer"
        />
      </EuiButtonEmpty>
    </EuiFlexItem>
  );

  return (
    <EuiPanel className="mapWidgetControl mapWidgetControl-hasShadow" paddingSize="none" grow={false}>
      <EuiFlexItem className="mapWidgetControl__header" grow={false}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          gutterSize="none"
        >
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  id="xpack.maps.layerControl.layersTitle"
                  defaultMessage="Layers"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {addLayer}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem className="mapLayerControl">
        <LayerTOC />
      </EuiFlexItem>
    </EuiPanel>
  );
}
