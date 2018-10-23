/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFormRow,
  EuiText,
} from '@elastic/eui';
import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';
import { SingleFieldSelect } from '../../components/single_field_select';

import { ASource } from './source';
import { GeohashGridLayer } from '../geohashgrid_layer';
import { Schemas } from 'ui/vis/editors/default/schemas';
import {
  indexPatternService,
  inspectorAdapters,
  SearchSource,
  timeService,
} from '../../../kibana_services';
import { createExtentFilter } from '../../../elasticsearch_geo_utils';
import { AggConfigs } from 'ui/vis/agg_configs';
import { tabifyAggResponse } from 'ui/agg_response/tabify';
import { convertToGeoJson } from 'ui/vis/map/convert_to_geojson';
import { getRequestInspectorStats, getResponseInspectorStats } from 'ui/courier/utils/courier_inspector_utils';

const aggSchemas = new Schemas([
  {
    group: 'metrics',
    name: 'metric',
    title: 'Value',
    min: 1,
    max: 1,  // TODO add support for multiple metric aggregations - convertToGeoJson will need to be tweeked
    aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits'],
    defaults: [
      { schema: 'metric', type: 'count' }
    ]
  },
  {
    group: 'buckets',
    name: 'segment',
    title: 'Geo Coordinates',
    aggFilter: 'geohash_grid',
    min: 1,
    max: 1
  }
]);

export class ESGeohashGridSource extends ASource {

  static type = 'ES_GEOHASH_GRID';

  static typeDisplayName = 'Elasticsearch geohash heatmap';

  static createDescriptor({ indexPatternId, geoField }) {
    return {
      type: ESGeohashGridSource.type,
      indexPatternId: indexPatternId,
      geoField: geoField,
    };
  }

  static renderEditor({ onPreviewSource }) {
    const onSelect = (layerConfig) => {
      const sourceDescriptor = ESGeohashGridSource.createDescriptor(layerConfig);
      const source = new ESGeohashGridSource(sourceDescriptor);
      onPreviewSource(source);
    };

    return (<Editor onSelect={onSelect}/>);
  }

  renderDetails() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Type: </strong><span>geohash_grid</span><br/>
          <strong className="gisLayerDetails__label">Index pattern: </strong><span>{this._descriptor.indexPatternId}</span><br/>
          <strong className="gisLayerDetails__label">Point field: </strong><span>{this._descriptor.geoField}</span><br/>
        </p>
      </EuiText>
    );
  }

  async getGeoJsonPointsWithTotalCount({ precision, extent, timeFilters, layerId, layerName }) {
    inspectorAdapters.requests.resetRequest(layerId);

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }

    const geoField = indexPattern.fields.byName[this._descriptor.geoField];
    if (!geoField) {
      throw new Error(`Index pattern ${indexPattern.title} no longer contains the geo field ${this._descriptor.geoField}`);
    }

    const aggConfigs = new AggConfigs(indexPattern, this._makeAggConfigs(precision), aggSchemas.all);

    let inspectorRequest;
    let resp;
    try {
      const searchSource = new SearchSource();
      searchSource.setField('index', indexPattern);
      searchSource.setField('size', 0);
      searchSource.setField('aggs', aggConfigs.toDsl());
      searchSource.setField('filter', () => {
        const filters = [];
        filters.push(createExtentFilter(extent, geoField.name, geoField.type));
        filters.push(timeService.createFilter(indexPattern, timeFilters));
        return filters;
      });

      inspectorRequest = inspectorAdapters.requests.start(layerId, layerName);
      inspectorRequest.stats(getRequestInspectorStats(searchSource));
      searchSource.getSearchRequestBody().then(body => {
        inspectorRequest.json(body);
      });
      resp = await searchSource.fetch();
      inspectorRequest
        .stats(getResponseInspectorStats(searchSource, resp))
        .ok({ json: resp });
    } catch(error) {
      inspectorRequest.error({ error });
      throw new Error(`Elasticsearch search request failed, error: ${error.message}`);
    }

    const tabifiedResp = tabifyAggResponse(aggConfigs, resp);
    const { featureCollection } = convertToGeoJson(tabifiedResp);

    return featureCollection;
  }

  async isTimeAware() {
    const indexPattern = await this._getIndexPattern();
    const timeField = indexPattern.timeFieldName;
    return !!timeField;
  }

  async _getIndexPattern() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }
    return indexPattern;
  }

  _makeAggConfigs(precision) {
    return [
      // TODO allow user to configure metric(s) aggregations
      {
        id: '1',
        enabled: true,
        type: 'count',
        schema: 'metric',
        params: {}
      },
      {
        id: '2',
        enabled: true,
        type: 'geohash_grid',
        schema: 'segment',
        params: {
          field: this._descriptor.geoField,
          isFilteredByCollar: false, // map extent filter is in query so no need to filter in aggregation
          useGeocentroid: true, // TODO make configurable
          autoPrecision: false, // false so we can define our own precision levels based on styling
          precision: precision,
        }
      }
    ];
  }

  _createDefaultLayerDescriptor(options) {
    return GeohashGridLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new GeohashGridLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  async getDisplayName() {
    const indexPattern = await this._getIndexPattern();
    return indexPattern.title;
  }
}

class Editor extends React.Component {

  static propTypes = {
    onSelect: PropTypes.func.isRequired,
  };


  static _filterGeoField = (field) => {
    return ['geo_point'].includes(field.type);
  };

  constructor() {
    super();
    this.state = {
      isLoadingIndexPattern: false,
      indexPatternId: '',
      geoField: '',
    };
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    this.loadIndexPattern(this.state.indexPatternId);
  }

  onIndexPatternSelect = (indexPatternId) => {
    this.setState({
      indexPatternId,
    }, this.loadIndexPattern(indexPatternId));
  };

  loadIndexPattern = (indexPatternId) => {
    this.setState({
      isLoadingIndexPattern: true,
      indexPattern: undefined,
      geoField: undefined,
    }, this.debouncedLoad.bind(null, indexPatternId));
  }


  debouncedLoad = _.debounce(async (indexPatternId) => {
    if (!indexPatternId || indexPatternId.length === 0) {
      return;
    }

    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(indexPatternId);
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

    this.setState({
      isLoadingIndexPattern: false,
      indexPattern: indexPattern
    });

    //make default selection
    const geoFields = indexPattern.fields.filter(Editor._filterGeoField);
    if (geoFields[0]) {
      this._onGeoFieldSelect(geoFields[0].name);
    }

  }, 300);

  _onGeoFieldSelect = (geoField) => {
    this.setState({
      geoField
    }, this.previewLayer);
  };


  previewLayer = () => {
    const {
      indexPatternId,
      geoField,
    } = this.state;
    if (indexPatternId && geoField) {
      this.props.onSelect({
        indexPatternId,
        geoField,
      });
    }
  }

  _renderGeoSelect() {
    if (!this.state.indexPattern) {
      return;
    }

    return (
      <EuiFormRow
        label="Geospatial field"
        compressed
      >
        <SingleFieldSelect
          placeholder="Select geo field"
          value={this.state.geoField}
          onChange={this._onGeoFieldSelect}
          filterField={Editor._filterGeoField}
          fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
        />
      </EuiFormRow>
    );
  }

  filterForGeoPoint = fields => {
    return fields.some(({ type }) => type === 'geo_point');
  }

  render() {
    return (
      <Fragment>

        <EuiFormRow
          label="Index pattern"
          compressed
        >
          <IndexPatternSelect
            indexPatternId={this.state.indexPatternId}
            onChange={this.onIndexPatternSelect}
            placeholder="Select index pattern"
            filterIndexPatterns={this.filterForGeoPoint}
          />
        </EuiFormRow>

        {this._renderGeoSelect()}

      </Fragment>
    );
  }
}
