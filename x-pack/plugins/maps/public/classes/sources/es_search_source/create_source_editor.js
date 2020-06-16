/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { EuiFormRow, EuiSpacer } from '@elastic/eui';

import { SingleFieldSelect } from '../../../components/single_field_select';
import { getIndexPatternService, getIndexPatternSelectComponent } from '../../../kibana_services';
import { NoIndexPatternCallout } from '../../../components/no_index_pattern_callout';
import { i18n } from '@kbn/i18n';
import { ES_GEO_FIELD_TYPES, SCALING_TYPES } from '../../../../common/constants';
import { DEFAULT_FILTER_BY_MAP_BOUNDS } from './constants';
import { ScalingForm } from './scaling_form';
import {
  getGeoFields,
  getTermsFields,
  getGeoTileAggNotSupportedReason,
  supportsGeoTileAgg,
} from '../../../index_pattern_util';

function doesGeoFieldSupportGeoTileAgg(indexPattern, geoFieldName) {
  return indexPattern ? supportsGeoTileAgg(indexPattern.fields.getByName(geoFieldName)) : false;
}

const RESET_INDEX_PATTERN_STATE = {
  indexPattern: undefined,
  geoFields: undefined,

  // ES search source descriptor state
  geoFieldName: undefined,
  filterByMapBounds: DEFAULT_FILTER_BY_MAP_BOUNDS,
  scalingType: SCALING_TYPES.CLUSTERS, // turn on clusting by default
  topHitsSplitField: undefined,
  topHitsSize: 1,
};

export class CreateSourceEditor extends Component {
  static propTypes = {
    onSourceConfigChange: PropTypes.func.isRequired,
  };

  state = {
    isLoadingIndexPattern: false,
    noGeoIndexPatternsExist: false,
    ...RESET_INDEX_PATTERN_STATE,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _onIndexPatternSelect = (indexPatternId) => {
    this.setState(
      {
        indexPatternId,
      },
      this._loadIndexPattern(indexPatternId)
    );
  };

  _loadIndexPattern = (indexPatternId) => {
    this.setState(
      {
        isLoadingIndexPattern: true,
        ...RESET_INDEX_PATTERN_STATE,
      },
      this._debouncedLoad.bind(null, indexPatternId)
    );
  };

  _debouncedLoad = _.debounce(async (indexPatternId) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
    } catch (err) {
      // index pattern no longer exists
      return;
    }

    if (!this._isMounted) {
      return;
    }

    // props.indexPatternId may be updated before getIndexPattern returns
    // ignore response when fetched index pattern does not match active index pattern
    if (indexPattern.id !== indexPatternId) {
      return;
    }

    const geoFields = getGeoFields(indexPattern.fields);
    this.setState({
      isLoadingIndexPattern: false,
      indexPattern: indexPattern,
      geoFields,
    });

    if (geoFields.length) {
      // make default selection, prefer aggregatable field over the first available
      const firstAggregatableGeoField = geoFields.find((geoField) => {
        return geoField.aggregatable;
      });
      const defaultGeoFieldName = firstAggregatableGeoField
        ? firstAggregatableGeoField
        : geoFields[0];
      this._onGeoFieldSelect(defaultGeoFieldName.name);
    }
  }, 300);

  _onGeoFieldSelect = (geoFieldName) => {
    // Respect previous scaling type selection unless newly selected geo field does not support clustering.
    const scalingType =
      this.state.scalingType === SCALING_TYPES.CLUSTERS &&
      !doesGeoFieldSupportGeoTileAgg(this.state.indexPattern, geoFieldName)
        ? SCALING_TYPES.LIMIT
        : this.state.scalingType;
    this.setState(
      {
        geoFieldName,
        scalingType,
      },
      this._previewLayer
    );
  };

  _onScalingPropChange = ({ propName, value }) => {
    this.setState(
      {
        [propName]: value,
      },
      this._previewLayer
    );
  };

  _previewLayer = () => {
    const {
      indexPatternId,
      geoFieldName,
      filterByMapBounds,
      scalingType,
      topHitsSplitField,
      topHitsSize,
    } = this.state;

    const sourceConfig =
      indexPatternId && geoFieldName
        ? {
            indexPatternId,
            geoField: geoFieldName,
            filterByMapBounds,
            scalingType,
            topHitsSplitField,
            topHitsSize,
          }
        : null;
    this.props.onSourceConfigChange(sourceConfig);
  };

  _onNoIndexPatterns = () => {
    this.setState({ noGeoIndexPatternsExist: true });
  };

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return;
    }

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.source.esSearch.geofieldLabel', {
          defaultMessage: 'Geospatial field',
        })}
      >
        <SingleFieldSelect
          placeholder={i18n.translate('xpack.maps.source.esSearch.selectLabel', {
            defaultMessage: 'Select geo field',
          })}
          value={this.state.geoFieldName}
          onChange={this._onGeoFieldSelect}
          fields={this.state.geoFields}
        />
      </EuiFormRow>
    );
  }

  _renderScalingPanel() {
    if (!this.state.indexPattern || !this.state.geoFieldName) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer size="m" />
        <ScalingForm
          filterByMapBounds={this.state.filterByMapBounds}
          indexPatternId={this.state.indexPatternId}
          onChange={this._onScalingPropChange}
          scalingType={this.state.scalingType}
          supportsClustering={doesGeoFieldSupportGeoTileAgg(
            this.state.indexPattern,
            this.state.geoFieldName
          )}
          clusteringDisabledReason={
            this.state.indexPattern
              ? getGeoTileAggNotSupportedReason(
                  this.state.indexPattern.fields.getByName(this.state.geoFieldName)
                )
              : null
          }
          termFields={getTermsFields(this.state.indexPattern.fields)}
          topHitsSplitField={this.state.topHitsSplitField}
          topHitsSize={this.state.topHitsSize}
        />
      </Fragment>
    );
  }

  _renderNoIndexPatternWarning() {
    if (!this.state.noGeoIndexPatternsExist) {
      return null;
    }

    return (
      <Fragment>
        <NoIndexPatternCallout />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  render() {
    const IndexPatternSelect = getIndexPatternSelectComponent();

    return (
      <Fragment>
        {this._renderNoIndexPatternWarning()}

        <EuiFormRow
          label={i18n.translate('xpack.maps.source.esSearch.indexPatternLabel', {
            defaultMessage: 'Index pattern',
          })}
        >
          <IndexPatternSelect
            isDisabled={this.state.noGeoIndexPatternsExist}
            indexPatternId={this.state.indexPatternId}
            onChange={this._onIndexPatternSelect}
            placeholder={i18n.translate(
              'xpack.maps.source.esSearch.selectIndexPatternPlaceholder',
              {
                defaultMessage: 'Select index pattern',
              }
            )}
            fieldTypes={ES_GEO_FIELD_TYPES}
            onNoIndexPatterns={this._onNoIndexPatterns}
          />
        </EuiFormRow>

        {this._renderGeoSelect()}

        {this._renderScalingPanel()}
      </Fragment>
    );
  }
}
