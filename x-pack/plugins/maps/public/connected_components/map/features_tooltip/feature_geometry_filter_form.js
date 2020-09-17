/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';

import { URL_MAX_LENGTH } from '../../../../../../../src/core/public';
import { createSpatialFilterWithGeometry } from '../../../../common/elasticsearch_geo_utils';
import { GEO_JSON_TYPE } from '../../../../common/constants';
import { GeometryFilterForm } from '../../../components/geometry_filter_form';

import rison from 'rison-node';

// over estimated and imprecise value to ensure filter has additional room for any meta keys added when filter is mapped.
const META_OVERHEAD = 100;

export class FeatureGeometryFilterForm extends Component {
  state = {
    isLoading: false,
    errorMsg: undefined,
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _loadPreIndexedShape = async () => {
    this.setState({
      isLoading: true,
    });

    let preIndexedShape;
    try {
      preIndexedShape = await this.props.loadPreIndexedShape();
    } catch (err) {
      // ignore error, just fall back to using geometry if preIndexedShape can not be fetched
    }

    if (this._isMounted) {
      this.setState({ isLoading: false });
    }

    return preIndexedShape;
  };

  _createFilter = async ({
    geometryLabel,
    indexPatternId,
    geoFieldName,
    geoFieldType,
    relation,
  }) => {
    this.setState({ errorMsg: undefined });
    const preIndexedShape = await this._loadPreIndexedShape();
    if (!this._isMounted) {
      // do not create filter if component is unmounted
      return;
    }

    const filter = createSpatialFilterWithGeometry({
      preIndexedShape,
      geometry: this.props.geometry,
      geometryLabel,
      indexPatternId,
      geoFieldName,
      geoFieldType,
      relation,
    });

    // Ensure filter will not overflow URL. Filters that contain geometry can be extremely large.
    // No elasticsearch support for pre-indexed shapes and geo_point spatial queries.
    if (
      window.location.href.length + rison.encode(filter).length + META_OVERHEAD >
      URL_MAX_LENGTH
    ) {
      this.setState({
        errorMsg: i18n.translate('xpack.maps.tooltip.geometryFilterForm.filterTooLargeMessage', {
          defaultMessage:
            'Cannot create filter. Filters are added to the URL, and this shape has too many vertices to fit in the URL.',
        }),
      });
      return;
    }

    this.props.addFilters([filter]);
    this.props.onClose();
  };

  render() {
    return (
      <GeometryFilterForm
        buttonLabel={i18n.translate(
          'xpack.maps.tooltip.geometryFilterForm.createFilterButtonLabel',
          {
            defaultMessage: 'Create filter',
          }
        )}
        geoFields={this.props.geoFields}
        getFilterActions={this.props.getFilterActions}
        getActionContext={this.props.getActionContext}
        intitialGeometryLabel={this.props.geometry.type.toLowerCase()}
        onSubmit={this._createFilter}
        isFilterGeometryClosed={
          this.props.geometry.type !== GEO_JSON_TYPE.LINE_STRING &&
          this.props.geometry.type !== GEO_JSON_TYPE.MULTI_LINE_STRING
        }
        isLoading={this.state.isLoading}
        errorMsg={this.state.errorMsg}
      />
    );
  }
}
