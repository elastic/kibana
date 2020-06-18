/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import {
  getAutocompleteService,
  fetchSearchSourceAndRecordWithInspector,
  getIndexPatternService,
  getTimeFilter,
  getSearchService,
} from '../../../kibana_services';
import { createExtentFilter } from '../../../elasticsearch_geo_utils';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';

import { copyPersistentState } from '../../../reducers/util';
import { DataRequestAbortError } from '../../util/data_request';
import { expandToTileBoundaries } from '../es_geo_grid_source/geo_tile_utils';

export class AbstractESSource extends AbstractVectorSource {
  constructor(descriptor, inspectorAdapters) {
    super(
      {
        ...descriptor,
        applyGlobalQuery: _.get(descriptor, 'applyGlobalQuery', true),
      },
      inspectorAdapters
    );
  }

  getId() {
    return this._descriptor.id;
  }

  isFieldAware() {
    return true;
  }

  isRefreshTimerAware() {
    return true;
  }

  isQueryAware() {
    return true;
  }

  getIndexPatternIds() {
    return [this.getIndexPatternId()];
  }

  getQueryableIndexPatternIds() {
    if (this.getApplyGlobalQuery()) {
      return [this.getIndexPatternId()];
    }
    return [];
  }

  isESSource() {
    return true;
  }

  destroy() {
    this._inspectorAdapters.requests.resetRequest(this.getId());
  }

  cloneDescriptor() {
    const clonedDescriptor = copyPersistentState(this._descriptor);
    // id used as uuid to track requests in inspector
    clonedDescriptor.id = uuid();
    return clonedDescriptor;
  }

  async _runEsQuery({
    requestId,
    requestName,
    requestDescription,
    searchSource,
    registerCancelCallback,
  }) {
    const abortController = new AbortController();
    registerCancelCallback(() => abortController.abort());

    try {
      return await fetchSearchSourceAndRecordWithInspector({
        inspectorAdapters: this._inspectorAdapters,
        searchSource,
        requestName,
        requestId,
        requestDesc: requestDescription,
        abortSignal: abortController.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      throw new Error(
        i18n.translate('xpack.maps.source.esSource.requestFailedErrorMessage', {
          defaultMessage: `Elasticsearch search request failed, error: {message}`,
          values: { message: error.message },
        })
      );
    }
  }

  async makeSearchSource(searchFilters, limit, initialSearchContext) {
    const indexPattern = await this.getIndexPattern();
    const isTimeAware = await this.isTimeAware();
    const applyGlobalQuery = _.get(searchFilters, 'applyGlobalQuery', true);
    const globalFilters = applyGlobalQuery ? searchFilters.filters : [];
    const allFilters = [...globalFilters];
    if (this.isFilterByMapBounds() && searchFilters.buffer) {
      //buffer can be empty
      const geoField = await this._getGeoField();
      const buffer = this.isGeoGridPrecisionAware()
        ? expandToTileBoundaries(searchFilters.buffer, searchFilters.geogridPrecision)
        : searchFilters.buffer;
      allFilters.push(createExtentFilter(buffer, geoField.name, geoField.type));
    }
    if (isTimeAware) {
      allFilters.push(getTimeFilter().createFilter(indexPattern, searchFilters.timeFilters));
    }
    const searchService = getSearchService();
    const searchSource = await searchService.searchSource.create(initialSearchContext);

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', limit);
    searchSource.setField('filter', allFilters);
    if (applyGlobalQuery) {
      searchSource.setField('query', searchFilters.query);
    }

    if (searchFilters.sourceQuery) {
      const layerSearchSource = searchService.searchSource.createEmpty();

      layerSearchSource.setField('index', indexPattern);
      layerSearchSource.setField('query', searchFilters.sourceQuery);
      searchSource.setParent(layerSearchSource);
    }

    return searchSource;
  }

  async getBoundsForFilters(boundsFilters, registerCancelCallback) {
    const searchSource = await this.makeSearchSource(boundsFilters, 0);
    searchSource.setField('aggs', {
      fitToBounds: {
        geo_bounds: {
          field: this._descriptor.geoField,
        },
      },
    });

    let esBounds;
    try {
      const abortController = new AbortController();
      registerCancelCallback(() => abortController.abort());
      const esResp = await searchSource.fetch({ abortSignal: abortController.signal });
      if (!esResp.aggregations.fitToBounds.bounds) {
        // aggregations.fitToBounds is empty object when there are no matching documents
        return null;
      }
      esBounds = esResp.aggregations.fitToBounds.bounds;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new DataRequestAbortError();
      }

      return null;
    }

    const minLon = esBounds.top_left.lon;
    const maxLon = esBounds.bottom_right.lon;
    return {
      minLon: minLon > maxLon ? minLon - 360 : minLon,
      maxLon,
      minLat: esBounds.bottom_right.lat,
      maxLat: esBounds.top_left.lat,
    };
  }

  async isTimeAware() {
    try {
      const indexPattern = await this.getIndexPattern();
      const timeField = indexPattern.timeFieldName;
      return !!timeField;
    } catch (error) {
      return false;
    }
  }

  getIndexPatternId() {
    return this._descriptor.indexPatternId;
  }

  getGeoFieldName() {
    return this._descriptor.geoField;
  }

  async getIndexPattern() {
    if (this.indexPattern) {
      return this.indexPattern;
    }

    try {
      this.indexPattern = await getIndexPatternService().get(this.getIndexPatternId());
      return this.indexPattern;
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noIndexPatternErrorMessage', {
          defaultMessage: `Unable to find Index pattern for id: {indexPatternId}`,
          values: { indexPatternId: this.getIndexPatternId() },
        })
      );
    }
  }

  async supportsFitToBounds() {
    try {
      const geoField = await this._getGeoField();
      return geoField.aggregatable;
    } catch (error) {
      return false;
    }
  }

  async _getGeoField() {
    const indexPattern = await this.getIndexPattern();
    const geoField = indexPattern.fields.getByName(this._descriptor.geoField);
    if (!geoField) {
      throw new Error(
        i18n.translate('xpack.maps.source.esSource.noGeoFieldErrorMessage', {
          defaultMessage: `Index pattern {indexPatternTitle} no longer contains the geo field {geoField}`,
          values: { indexPatternTitle: indexPattern.title, geoField: this._descriptor.geoField },
        })
      );
    }
    return geoField;
  }

  async getDisplayName() {
    try {
      const indexPattern = await this.getIndexPattern();
      return indexPattern.title;
    } catch (error) {
      // Unable to load index pattern, just return id as display name
      return this.getIndexPatternId();
    }
  }

  isBoundsAware() {
    return true;
  }

  getId() {
    return this._descriptor.id;
  }

  async createFieldFormatter(field) {
    let indexPattern;
    try {
      indexPattern = await this.getIndexPattern();
    } catch (error) {
      return null;
    }

    const fieldFromIndexPattern = indexPattern.fields.getByName(field.getRootName());
    if (!fieldFromIndexPattern) {
      return null;
    }

    return fieldFromIndexPattern.format.getConverterFor('text');
  }

  async loadStylePropsMeta(
    layerName,
    style,
    dynamicStyleProps,
    registerCancelCallback,
    searchFilters
  ) {
    const promises = dynamicStyleProps.map((dynamicStyleProp) => {
      return dynamicStyleProp.getFieldMetaRequest();
    });

    const fieldAggRequests = await Promise.all(promises);
    const aggs = fieldAggRequests.reduce((aggs, fieldAggRequest) => {
      return fieldAggRequest ? { ...aggs, ...fieldAggRequest } : aggs;
    }, {});

    const indexPattern = await this.getIndexPattern();
    const searchService = getSearchService();
    const searchSource = searchService.searchSource.createEmpty();

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 0);
    searchSource.setField('aggs', aggs);
    if (searchFilters.sourceQuery) {
      searchSource.setField('query', searchFilters.sourceQuery);
    }
    if (style.isTimeAware() && (await this.isTimeAware())) {
      searchSource.setField('filter', [
        getTimeFilter().createFilter(indexPattern, searchFilters.timeFilters),
      ]);
    }

    const resp = await this._runEsQuery({
      requestId: `${this.getId()}_styleMeta`,
      requestName: i18n.translate('xpack.maps.source.esSource.stylePropsMetaRequestName', {
        defaultMessage: '{layerName} - metadata',
        values: { layerName },
      }),
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate(
        'xpack.maps.source.esSource.stylePropsMetaRequestDescription',
        {
          defaultMessage:
            'Elasticsearch request retrieving field metadata used for calculating symbolization bands.',
        }
      ),
    });

    return resp.aggregations;
  }

  getValueSuggestions = async (field, query) => {
    try {
      const indexPattern = await this.getIndexPattern();
      return await getAutocompleteService().getValueSuggestions({
        indexPattern,
        field: indexPattern.fields.getByName(field.getRootName()),
        query,
      });
    } catch (error) {
      console.warn(
        `Unable to fetch suggestions for field: ${field.getRootName()}, query: ${query}, error: ${
          error.message
        }`
      );
      return [];
    }
  };
}
