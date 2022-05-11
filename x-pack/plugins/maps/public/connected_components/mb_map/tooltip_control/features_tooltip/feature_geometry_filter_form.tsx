/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';

import { Filter } from '@kbn/es-query';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { Geometry, Polygon } from 'geojson';
import rison, { RisonObject } from 'rison-node';
import { URL_MAX_LENGTH } from '@kbn/core/public';
import { ACTION_GLOBAL_APPLY_FILTER } from '@kbn/unified-search-plugin/public';
import {
  createSpatialFilterWithGeometry,
  PreIndexedShape,
} from '../../../../../common/elasticsearch_util';
import { ES_SPATIAL_RELATIONS, GEO_JSON_TYPE } from '../../../../../common/constants';
import { GeometryFilterForm } from '../../../../components/draw_forms/geometry_filter_form/geometry_filter_form';

// over estimated and imprecise value to ensure filter has additional room for any meta keys added when filter is mapped.
const META_OVERHEAD = 100;

interface Props {
  onClose: () => void;
  geometry: Geometry;
  addFilters: (filters: Filter[], actionId: string) => Promise<void>;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  loadPreIndexedShape: () => Promise<PreIndexedShape | null>;
  geoFieldNames: string[];
}

interface State {
  isLoading: boolean;
  errorMsg: string | undefined;
}

export class FeatureGeometryFilterForm extends Component<Props, State> {
  private _isMounted = false;
  state: State = {
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
    relation,
  }: {
    geometryLabel: string;
    relation: ES_SPATIAL_RELATIONS;
  }) => {
    this.setState({ errorMsg: undefined });
    const preIndexedShape = await this._loadPreIndexedShape();
    if (!this._isMounted) {
      // do not create filter if component is unmounted
      return;
    }

    const filter = createSpatialFilterWithGeometry({
      preIndexedShape,
      geometry: this.props.geometry as Polygon,
      geometryLabel,
      geoFieldNames: this.props.geoFieldNames,
      relation,
    });

    // Ensure filter will not overflow URL. Filters that contain geometry can be extremely large.
    // No elasticsearch support for pre-indexed shapes and geo_point spatial queries.
    if (
      window.location.href.length +
        rison.encode(filter as unknown as RisonObject).length +
        META_OVERHEAD >
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

    this.props.addFilters([filter], ACTION_GLOBAL_APPLY_FILTER);
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
