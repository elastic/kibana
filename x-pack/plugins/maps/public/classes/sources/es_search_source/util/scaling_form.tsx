/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiFormRow,
  EuiHorizontalRule,
  EuiRadio,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiTitle,
  EuiToolTip,
  EuiBetaBadge,
} from '@elastic/eui';
import { i18n } from '../../../../../../../../../../../.cache/bazel/_bazel_aaron/624b00c49acd21a09431ae49da30ba85/execroot/kibana/bazel-out/k8-fastbuild/bin/packages/kbn-i18n';
import { FormattedMessage } from '../../../../../../../../../../../.cache/bazel/_bazel_aaron/624b00c49acd21a09431ae49da30ba85/execroot/kibana/bazel-out/k8-fastbuild/bin/packages/kbn-i18n/target_types/react';
import { getIndexPatternService } from '../../../../kibana_services';
import {
  DEFAULT_MAX_RESULT_WINDOW,
  LAYER_TYPE,
  SCALING_TYPES,
} from '../../../../../common/constants';
import { loadIndexSettings } from './load_index_settings';
import { OnSourceChangeArgs } from '../../source';

interface Props {
  filterByMapBounds: boolean;
  indexPatternId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  scalingType: SCALING_TYPES;
  supportsClustering: boolean;
  clusteringDisabledReason?: string | null;
}

interface State {
  maxResultWindow: number;
}

export class ScalingForm extends Component<Props, State> {
  state = {
    maxResultWindow: DEFAULT_MAX_RESULT_WINDOW,
  };
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;
    this.loadIndexSettings();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async loadIndexSettings() {
    try {
      const indexPattern = await getIndexPatternService().get(this.props.indexPatternId);
      const { maxResultWindow } = await loadIndexSettings(indexPattern!.title);
      if (this._isMounted) {
        this.setState({ maxResultWindow });
      }
    } catch (err) {
      return;
    }
  }

  _onScalingTypeChange = (optionId: string): void => {
    let layerType;
    if (optionId === SCALING_TYPES.CLUSTERS) {
      layerType = LAYER_TYPE.BLENDED_VECTOR;
    } else if (optionId === SCALING_TYPES.MVT) {
      layerType = LAYER_TYPE.TILED_VECTOR;
    } else {
      layerType = LAYER_TYPE.VECTOR;
    }

    this.props.onChange({ propName: 'scalingType', value: optionId, newLayerType: layerType });
  };

  _onFilterByMapBoundsChange = (event: EuiSwitchEvent) => {
    this.props.onChange({ propName: 'filterByMapBounds', value: event.target.checked });
  };

  _renderClusteringRadio() {
    const clusteringRadio = (
      <EuiRadio
        id={SCALING_TYPES.CLUSTERS}
        label={i18n.translate('xpack.maps.source.esSearch.clusterScalingLabel', {
          defaultMessage: 'Show clusters when results exceed {maxResultWindow}.',
          values: { maxResultWindow: this.state.maxResultWindow },
        })}
        checked={this.props.scalingType === SCALING_TYPES.CLUSTERS}
        onChange={() => this._onScalingTypeChange(SCALING_TYPES.CLUSTERS)}
        disabled={!this.props.supportsClustering}
      />
    );

    return this.props.clusteringDisabledReason ? (
      <EuiToolTip position="left" content={this.props.clusteringDisabledReason}>
        {clusteringRadio}
      </EuiToolTip>
    ) : (
      clusteringRadio
    );
  }

  _renderMVTRadio() {
    const labelText = i18n.translate('xpack.maps.source.esSearch.useMVTVectorTiles', {
      defaultMessage: 'Use vector tiles',
    });
    const mvtRadio = (
      <EuiRadio
        id={SCALING_TYPES.MVT}
        label={labelText}
        checked={this.props.scalingType === SCALING_TYPES.MVT}
        onChange={() => this._onScalingTypeChange(SCALING_TYPES.MVT)}
      />
    );

    const enabledInfo = (
      <>
        <EuiBetaBadge label={'beta'} />
        <EuiHorizontalRule margin="xs" />
        {i18n.translate('xpack.maps.source.esSearch.mvtDescription', {
          defaultMessage: 'Use vector tiles for faster display of large datasets.',
        })}
      </>
    );

    return (
      <EuiToolTip position="left" content={enabledInfo}>
        {mvtRadio}
      </EuiToolTip>
    );
  }

  render() {
    let filterByBoundsSwitch;
    if (this.props.scalingType === SCALING_TYPES.LIMIT) {
      filterByBoundsSwitch = (
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('xpack.maps.source.esSearch.extentFilterLabel', {
              defaultMessage: 'Dynamically filter for data in the visible map area',
            })}
            checked={this.props.filterByMapBounds}
            onChange={this._onFilterByMapBoundsChange}
            compressed
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage id="xpack.maps.esSearch.scaleTitle" defaultMessage="Scaling" />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow>
          <div>
            <EuiRadio
              id={SCALING_TYPES.LIMIT}
              label={i18n.translate('xpack.maps.source.esSearch.limitScalingLabel', {
                defaultMessage: 'Limit results to {maxResultWindow}.',
                values: { maxResultWindow: this.state.maxResultWindow },
              })}
              checked={this.props.scalingType === SCALING_TYPES.LIMIT}
              onChange={() => this._onScalingTypeChange(SCALING_TYPES.LIMIT)}
            />
            {this._renderClusteringRadio()}
            {this._renderMVTRadio()}
          </div>
        </EuiFormRow>

        {filterByBoundsSwitch}
      </Fragment>
    );
  }
}
