/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButton,
  EuiTitle,
  EuiSpacer,
  EuiButtonIcon,
} from '@elastic/eui';
import { LayerTOC } from './layer_toc';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

export function LayerControl({ isReadOnly, isLayerTOCOpen, showAddLayerWizard, closeLayerTOC, openLayerTOC }) {
  if (!isLayerTOCOpen) {
    return (
      <EuiButton
        className="mapLayerControl__openLayerTOCButton"
        onClick={openLayerTOC}
        iconType="arrowLeft"
        aria-label={i18n.translate('xpack.maps.layerControl.openLayerTOCButtonAriaLabel', {
          defaultMessage: 'Open layer table of contents'
        })}
      />
    );
  }

  let addLayer;
  if (!isReadOnly) {
    addLayer = (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiButton
          className="mapLayerControl__addLayerButton"
          fill
          onClick={showAddLayerWizard}
          data-test-subj="addLayerButton"
        >
          <FormattedMessage
            id="xpack.maps.layerControl.addLayerButtonLabel"
            defaultMessage="Add layer"
          />
        </EuiButton>
      </Fragment>
    );
  }

  return (
    <Fragment>
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
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                onClick={closeLayerTOC}
                iconType="arrowRight"
                aria-label={i18n.translate('xpack.maps.layerControl.closeLayerTOCButtonAriaLabel', {
                  defaultMessage: 'Close layer table of contents'
                })}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem className="mapLayerControl">
          <LayerTOC />
        </EuiFlexItem>
      </EuiPanel>

      {addLayer}

    </Fragment>
  );
}
