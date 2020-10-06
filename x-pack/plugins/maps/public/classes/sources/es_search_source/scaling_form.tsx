/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { SingleFieldSelect } from '../../../components/single_field_select';
import { getIndexPatternService } from '../../../kibana_services';
// @ts-ignore
import { ValidatedRange } from '../../../components/validated_range';
import {
  DEFAULT_MAX_INNER_RESULT_WINDOW,
  DEFAULT_MAX_RESULT_WINDOW,
  LAYER_TYPE,
  SCALING_TYPES,
} from '../../../../common/constants';
// @ts-ignore
import { loadIndexSettings } from './load_index_settings';
import { IFieldType } from '../../../../../../../src/plugins/data/public';
import { OnSourceChangeArgs } from '../../../connected_components/layer_panel/view';

interface Props {
  filterByMapBounds: boolean;
  indexPatternId: string;
  onChange: (args: OnSourceChangeArgs) => void;
  scalingType: SCALING_TYPES;
  supportsClustering: boolean;
  clusteringDisabledReason?: string | null;
  termFields: IFieldType[];
  topHitsSplitField: string | null;
  topHitsSize: number;
}

interface State {
  maxInnerResultWindow: number;
  maxResultWindow: number;
}

export class ScalingForm extends Component<Props, State> {
  state = {
    maxInnerResultWindow: DEFAULT_MAX_INNER_RESULT_WINDOW,
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
      const { maxInnerResultWindow, maxResultWindow } = await loadIndexSettings(
        indexPattern!.title
      );
      if (this._isMounted) {
        this.setState({ maxInnerResultWindow, maxResultWindow });
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

  _onTopHitsSplitFieldChange = (topHitsSplitField?: string) => {
    if (!topHitsSplitField) {
      return;
    }
    this.props.onChange({ propName: 'topHitsSplitField', value: topHitsSplitField });
  };

  _onTopHitsSizeChange = (size: number) => {
    this.props.onChange({ propName: 'topHitsSize', value: size });
  };

  _renderTopHitsForm() {
    let sizeSlider;
    if (this.props.topHitsSplitField) {
      sizeSlider = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSizeLabel', {
            defaultMessage: 'Documents per entity',
          })}
          display="columnCompressed"
        >
          <ValidatedRange
            min={1}
            max={this.state.maxInnerResultWindow}
            step={1}
            value={this.props.topHitsSize}
            onChange={this._onTopHitsSizeChange}
            showLabels
            showInput
            showRange
            data-test-subj="layerPanelTopHitsSize"
            compressed
          />
        </EuiFormRow>
      );
    }

    return (
      <Fragment>
        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.topHitsSplitFieldLabel', {
            defaultMessage: 'Entity',
          })}
          display="columnCompressed"
        >
          <SingleFieldSelect
            placeholder={i18n.translate(
              'xpack.maps.source.esSearch.topHitsSplitFieldSelectPlaceholder',
              {
                defaultMessage: 'Select entity field',
              }
            )}
            value={this.props.topHitsSplitField}
            onChange={this._onTopHitsSplitFieldChange}
            fields={this.props.termFields}
            isClearable={false}
            compressed
          />
        </EuiFormRow>

        {sizeSlider}
      </Fragment>
    );
  }

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
    if (
      this.props.scalingType === SCALING_TYPES.TOP_HITS ||
      this.props.scalingType === SCALING_TYPES.LIMIT
    ) {
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

    let topHitsOptionsForm = null;
    if (this.props.scalingType === SCALING_TYPES.TOP_HITS) {
      topHitsOptionsForm = (
        <Fragment>
          <EuiHorizontalRule margin="xs" />
          {this._renderTopHitsForm()}
        </Fragment>
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
            <EuiRadio
              id={SCALING_TYPES.TOP_HITS}
              label={i18n.translate('xpack.maps.source.esSearch.useTopHitsLabel', {
                defaultMessage: 'Show top hits per entity.',
              })}
              checked={this.props.scalingType === SCALING_TYPES.TOP_HITS}
              onChange={() => this._onScalingTypeChange(SCALING_TYPES.TOP_HITS)}
            />
            {this._renderClusteringRadio()}
            {this._renderMVTRadio()}
          </div>
        </EuiFormRow>

        {filterByBoundsSwitch}
        {topHitsOptionsForm}
      </Fragment>
    );
  }
}
