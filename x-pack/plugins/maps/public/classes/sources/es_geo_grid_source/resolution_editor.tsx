/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, MouseEvent } from 'react';
import { EuiConfirmModal, EuiFormRow, EuiRange } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AggDescriptor } from '../../../../common/descriptor_types';
import { AGG_TYPE, GRID_RESOLUTION } from '../../../../common/constants';

function resolutionToSliderValue(resolution: GRID_RESOLUTION) {
  if (resolution === GRID_RESOLUTION.SUPER_FINE) {
    return 4;
  }

  if (resolution === GRID_RESOLUTION.MOST_FINE) {
    return 3;
  }

  if (resolution === GRID_RESOLUTION.FINE) {
    return 2;
  }

  return 1;
}

function sliderValueToResolution(value: number) {
  if (value === 4) {
    return GRID_RESOLUTION.SUPER_FINE;
  }

  if (value === 3) {
    return GRID_RESOLUTION.MOST_FINE;
  }

  if (value === 2) {
    return GRID_RESOLUTION.FINE;
  }

  return GRID_RESOLUTION.COARSE;
}

function isUnsupportedVectorTileMetric(metric: AggDescriptor) {
  return metric.type === AGG_TYPE.TERMS;
}

interface Props {
  isHeatmap: boolean;
  resolution: GRID_RESOLUTION;
  onChange: (resolution: GRID_RESOLUTION, metrics: AggDescriptor[]) => void;
  metrics: AggDescriptor[];
}

interface State {
  showModal: boolean;
}

export class ResolutionEditor extends Component<Props, State> {
  state: State = {
    showModal: false,
  };

  _onResolutionChange = (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    const resolution = sliderValueToResolution(parseInt(event.currentTarget.value, 10));
    if (!this.props.isHeatmap && resolution === GRID_RESOLUTION.SUPER_FINE) {
      const hasUnsupportedMetrics = this.props.metrics.find(isUnsupportedVectorTileMetric);
      if (hasUnsupportedMetrics) {
        this.setState({ showModal: true });
        return;
      }
    }

    this.props.onChange(resolution, this.props.metrics);
  };

  _closeModal = () => {
    this.setState({
      showModal: false,
    });
  };

  _acceptModal = () => {
    this._closeModal();
    const supportedMetrics = this.props.metrics.filter((metric) => {
      return !isUnsupportedVectorTileMetric(metric);
    });
    this.props.onChange(
      GRID_RESOLUTION.SUPER_FINE,
      supportedMetrics.length ? supportedMetrics : [{ type: AGG_TYPE.COUNT }]
    );
  };

  _renderModal() {
    return this.state.showModal ? (
      <EuiConfirmModal
        title={i18n.translate('xpack.maps.source.esGrid.vectorTileModal.title', {
          defaultMessage: `'Top terms' metrics not supported`,
        })}
        onCancel={this._closeModal}
        onConfirm={this._acceptModal}
        cancelButtonText={i18n.translate(
          'xpack.maps.source.esGrid.vectorTileModal.cancelBtnLabel',
          {
            defaultMessage: 'Cancel',
          }
        )}
        confirmButtonText={i18n.translate(
          'xpack.maps.source.esGrid.vectorTileModal.confirmBtnLabel',
          {
            defaultMessage: 'Accept',
          }
        )}
        buttonColor="danger"
        defaultFocusedButton="cancel"
      >
        <p>
          <FormattedMessage
            id="xpack.maps.source.esGrid.vectorTileModal.message"
            defaultMessage="High resolution uses vector tiles from the Elasticsearch vector tile API. Elasticsearch vector tile API does not support 'Top terms' metric. Switching to super fine grid resolution will remove all 'Top terms' metrics from your layer configuration."
          />
        </p>
      </EuiConfirmModal>
    ) : null;
  }

  render() {
    const helpText =
      !this.props.isHeatmap && this.props.resolution === GRID_RESOLUTION.SUPER_FINE
        ? i18n.translate('xpack.maps.source.esGrid.superFineHelpText', {
            defaultMessage: 'High resolution uses vector tiles.',
          })
        : undefined;
    return (
      <>
        {this._renderModal()}
        <EuiFormRow
          label={i18n.translate('xpack.maps.geoGrid.resolutionLabel', {
            defaultMessage: 'Resolution',
          })}
          helpText={helpText}
          display="columnCompressed"
        >
          <EuiRange
            value={resolutionToSliderValue(this.props.resolution)}
            onChange={this._onResolutionChange}
            min={1}
            max={4}
            showTicks
            tickInterval={1}
            ticks={[
              {
                label: i18n.translate('xpack.maps.source.esGrid.lowLabel', {
                  defaultMessage: `low`,
                }),
                value: 1,
              },
              { label: '', value: 2 },
              { label: '', value: 3 },
              {
                label: i18n.translate('xpack.maps.source.esGrid.highLabel', {
                  defaultMessage: `high`,
                }),
                value: 4,
              },
            ]}
            compressed
          />
        </EuiFormRow>
      </>
    );
  }
}
