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
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { LayerTOC } from './layer_toc';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

function renderExpandButton({ hasErrors, isLoading, onClick }) {
  const expandLabel = i18n.translate('xpack.maps.layerControl.openLayerTOCButtonAriaLabel', {
    defaultMessage: 'Expand layers panel',
  });

  if (isLoading) {
    // Can not use EuiButtonIcon with spinner because spinner is a class and not an icon
    return (
      <button
        className="euiButtonIcon euiButtonIcon--text mapLayerControl__openLayerTOCButton"
        type="button"
        onClick={onClick}
        aria-label={expandLabel}
      >
        <EuiLoadingSpinner size="m" />
      </button>
    );
  }

  return (
    <EuiButtonIcon
      className="mapLayerControl__openLayerTOCButton"
      color="text"
      onClick={onClick}
      iconType={hasErrors ? 'alert' : 'menuLeft'}
      aria-label={expandLabel}
    />
  );
}

export function LayerControl({
  isReadOnly,
  isLayerTOCOpen,
  showAddLayerWizard,
  closeLayerTOC,
  openLayerTOC,
  layerList,
  isFlyoutOpen,
}) {
  if (!isLayerTOCOpen) {
    const hasErrors = layerList.some((layer) => {
      return layer.hasErrors();
    });
    const isLoading = layerList.some((layer) => {
      return layer.isLayerLoading();
    });

    return (
      <EuiToolTip
        delay="long"
        content={i18n.translate('xpack.maps.layerControl.openLayerTOCButtonAriaLabel', {
          defaultMessage: 'Expand layers panel',
        })}
        position="left"
      >
        {renderExpandButton({ hasErrors, isLoading, onClick: openLayerTOC })}
      </EuiToolTip>
    );
  }

  let addLayer;
  if (!isReadOnly) {
    addLayer = (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiButton
          isDisabled={isFlyoutOpen}
          className="mapLayerControl__addLayerButton"
          fill
          fullWidth
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
      <EuiPanel
        className="mapWidgetControl mapWidgetControl-hasShadow"
        paddingSize="none"
        grow={false}
      >
        <EuiFlexItem className="mapWidgetControl__headerFlexItem" grow={false}>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            responsive={false}
            gutterSize="none"
          >
            <EuiFlexItem>
              <EuiTitle size="xxxs" className="mapWidgetControl__header">
                <h2>
                  <FormattedMessage
                    id="xpack.maps.layerControl.layersTitle"
                    defaultMessage="Layers"
                  />
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                delay="long"
                content={i18n.translate('xpack.maps.layerControl.closeLayerTOCButtonAriaLabel', {
                  defaultMessage: 'Collapse layers panel',
                })}
              >
                <EuiButtonIcon
                  className="mapLayerControl__closeLayerTOCButton"
                  onClick={closeLayerTOC}
                  iconType="menuRight"
                  color="text"
                  aria-label={i18n.translate(
                    'xpack.maps.layerControl.closeLayerTOCButtonAriaLabel',
                    {
                      defaultMessage: 'Collapse layers panel',
                    }
                  )}
                  data-test-subj="mapToggleLegendButton"
                />
              </EuiToolTip>
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
