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
import { AGG_TYPE, GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';
import { isMvt } from './is_mvt';

function isUnsupportedVectorTileMetric(metric: AggDescriptor) {
  return metric.type === AGG_TYPE.TERMS;
}

interface Props {
  renderAs: RENDER_AS;
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

  _getScale() {
    return this.props.renderAs === RENDER_AS.HEX
      ? {
          [GRID_RESOLUTION.SUPER_FINE]: 3,
          [GRID_RESOLUTION.MOST_FINE]: 2,
          [GRID_RESOLUTION.FINE]: 2,
          [GRID_RESOLUTION.COARSE]: 1,
        }
      : {
          [GRID_RESOLUTION.SUPER_FINE]: 4,
          [GRID_RESOLUTION.MOST_FINE]: 3,
          [GRID_RESOLUTION.FINE]: 2,
          [GRID_RESOLUTION.COARSE]: 1,
        };
  }

  _getTicks() {
    const scale = this._getScale();
    const unlabeledTicks = [
      {
        label: '',
        value: scale[GRID_RESOLUTION.FINE],
      },
    ];
    if (scale[GRID_RESOLUTION.FINE] !== scale[GRID_RESOLUTION.MOST_FINE]) {
      unlabeledTicks.push({
        label: '',
        value: scale[GRID_RESOLUTION.MOST_FINE],
      });
    }

    return [
      {
        label: i18n.translate('xpack.maps.source.esGrid.lowLabel', {
          defaultMessage: `low`,
        }),
        value: scale[GRID_RESOLUTION.COARSE],
      },
      ...unlabeledTicks,
      {
        label: i18n.translate('xpack.maps.source.esGrid.highLabel', {
          defaultMessage: `high`,
        }),
        value: scale[GRID_RESOLUTION.SUPER_FINE],
      },
    ];
  }

  _resolutionToSliderValue(resolution: GRID_RESOLUTION): number {
    const scale = this._getScale();
    return scale[resolution];
  }

  _sliderValueToResolution(value: number): GRID_RESOLUTION {
    const scale = this._getScale();
    const resolution = Object.keys(scale).find((key) => {
      return scale[key as GRID_RESOLUTION] === value;
    });
    return resolution ? (resolution as GRID_RESOLUTION) : GRID_RESOLUTION.COARSE;
  }

  _onResolutionChange = (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
    const resolution = this._sliderValueToResolution(parseInt(event.currentTarget.value, 10));
    if (isMvt(this.props.renderAs, resolution)) {
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
      (this.props.renderAs === RENDER_AS.POINT || this.props.renderAs === RENDER_AS.GRID) &&
      this.props.resolution === GRID_RESOLUTION.SUPER_FINE
        ? i18n.translate('xpack.maps.source.esGrid.superFineHelpText', {
            defaultMessage: 'High resolution uses vector tiles.',
          })
        : undefined;
    const ticks = this._getTicks();
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
            value={this._resolutionToSliderValue(this.props.resolution)}
            onChange={this._onResolutionChange}
            min={1}
            max={ticks.length}
            showTicks
            tickInterval={1}
            ticks={ticks}
            compressed
          />
        </EuiFormRow>
      </>
    );
  }
}
