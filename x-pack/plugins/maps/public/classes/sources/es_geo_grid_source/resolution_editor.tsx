/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import { EuiConfirmModal, EuiSelect, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { AggDescriptor } from '../../../../common/descriptor_types';
import { AGG_TYPE, GRID_RESOLUTION } from '../../../../common/constants';

const BASE_OPTIONS = [
  {
    value: GRID_RESOLUTION.COARSE,
    text: i18n.translate('xpack.maps.source.esGrid.coarseDropdownOption', {
      defaultMessage: 'coarse',
    }),
  },
  {
    value: GRID_RESOLUTION.FINE,
    text: i18n.translate('xpack.maps.source.esGrid.fineDropdownOption', {
      defaultMessage: 'fine',
    }),
  },
  {
    value: GRID_RESOLUTION.MOST_FINE,
    text: i18n.translate('xpack.maps.source.esGrid.finestDropdownOption', {
      defaultMessage: 'finest',
    }),
  },
];

function isUnsupportedVectorTileMetric(metric: AggDescriptor) {
  return metric.type === AGG_TYPE.TERMS;
}

interface Props {
  includeSuperFine: boolean;
  resolution: GRID_RESOLUTION;
  onChange: (resolution: GRID_RESOLUTION, metrics: AggDescriptor[]) => void;
  metrics: AggDescriptor[];
}

interface State {
  showModal: boolean;
}

export class ResolutionEditor extends Component<Props, State> {
  private readonly _options = [...BASE_OPTIONS];

  constructor(props: Props) {
    super(props);

    this.state = {
      showModal: false,
    };

    if (props.includeSuperFine) {
      this._options.push({
        value: GRID_RESOLUTION.SUPER_FINE,
        text: i18n.translate('xpack.maps.source.esGrid.superFineDropDownOption', {
          defaultMessage: 'super fine',
        }),
      });
    }
  }

  _onResolutionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const resolution = e.target.value as GRID_RESOLUTION;
    if (resolution === GRID_RESOLUTION.SUPER_FINE) {
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
            defaultMessage="Super fine grid resolution uses vector tiles from the Elasticsearch vector tile API. Elasticsearch vector tile API does not support 'Top terms' metric. Switching to super fine grid resolution will remove all 'Top terms' metrics from your layer configuration."
          />
        </p>
      </EuiConfirmModal>
    ) : null;
  }

  render() {
    const helpText =
      this.props.resolution === GRID_RESOLUTION.SUPER_FINE
        ? i18n.translate('xpack.maps.source.esGrid.superFineHelpText', {
            defaultMessage: 'Super fine grid resolution uses vector tiles.',
          })
        : undefined;
    return (
      <>
        {this._renderModal()}
        <EuiFormRow
          label={i18n.translate('xpack.maps.geoGrid.resolutionLabel', {
            defaultMessage: 'Grid resolution',
          })}
          helpText={helpText}
          display="columnCompressed"
        >
          <EuiSelect
            options={this._options}
            value={this.props.resolution}
            onChange={this._onResolutionChange}
            compressed
          />
        </EuiFormRow>
      </>
    );
  }
}
