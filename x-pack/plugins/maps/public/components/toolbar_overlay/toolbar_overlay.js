/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { getIndexPatternsFromIds } from '../../index_pattern_util';
import { ES_GEO_FIELD_TYPE } from '../../../common/constants';
import { SetViewControl } from './set_view_control';
import { ToolsControl } from './tools_control';

export class ToolbarOverlay extends React.Component {

  state = {
    prevUniqueIndexPatternIds: [],
    uniqueIndexPatternsAndGeoFields: [],
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if (this.props.isFilterable) {
      const nextUniqueIndexPatternIds = _.get(this.props, 'uniqueIndexPatternIds', []);
      this._loadUniqueIndexPatternAndFieldCombos(nextUniqueIndexPatternIds);
    }
  }

  _loadUniqueIndexPatternAndFieldCombos = async (nextUniqueIndexPatternIds) => {
    if (_.isEqual(nextUniqueIndexPatternIds, this.state.prevUniqueIndexPatternIds)) {
      // all ready loaded index pattern ids
      return;
    }

    this.setState({
      prevUniqueIndexPatternIds: nextUniqueIndexPatternIds,
    });

    const uniqueIndexPatternsAndGeoFields = [];
    try {
      const indexPatterns = await getIndexPatternsFromIds(nextUniqueIndexPatternIds);
      indexPatterns.forEach((indexPattern) => {
        indexPattern.fields.forEach(field => {
          if (field.type === ES_GEO_FIELD_TYPE.GEO_POINT || field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE) {
            uniqueIndexPatternsAndGeoFields.push({
              geoField: field.name,
              geoFieldType: field.type,
              indexPatternTitle: indexPattern.title,
              indexPatternId: indexPattern.id
            });
          }
        });
      });
    } catch(e) {
      // swallow errors.
      // the Layer-TOC will indicate which layers are disfunctional on a per-layer basis
    }

    if (!this._isMounted) {
      return;
    }

    this.setState({ uniqueIndexPatternsAndGeoFields });
  }

  _renderToolsControl() {
    const { uniqueIndexPatternsAndGeoFields } = this.state;
    if (
      !this.props.isFilterable ||
      !uniqueIndexPatternsAndGeoFields.length
    ) {
      return null;
    }

    return (
      <EuiFlexItem>
        <ToolsControl
          uniqueIndexPatternsAndGeoFields={uniqueIndexPatternsAndGeoFields}
        />
      </EuiFlexItem>
    );
  }

  render() {
    return (
      <EuiFlexGroup
        className="mapToolbarOverlay"
        responsive={false}
        direction="column"
        alignItems="flexEnd"
        gutterSize="s"
      >

        <EuiFlexItem>
          <SetViewControl />
        </EuiFlexItem>

        {this._renderToolsControl()}

      </EuiFlexGroup>
    );
  }
}
