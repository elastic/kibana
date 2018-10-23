/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {  } from 'react';

import {
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';

import { SingleFieldSelect } from '../../../../shared/components/single_field_select';

import {
  indexPatternService,
} from '../../../../kibana_services';


import { IndexPatternSelect } from 'ui/index_patterns/components/index_pattern_select';

export class DataSelector extends React.Component {

  constructor() {
    super();
    this.state = {
      indexPatternId: null,
      indexPattern: null,
      selectedStringField: null
    };
  }

  _onIndexPatternSelect = async (indexPatternId) => {

    this.setState({
      indexPatternId: indexPatternId
    });

    const indexPattern = await indexPatternService.get(indexPatternId);

    this.setState({
      indexPatternId: indexPatternId,
      indexPattern: indexPattern
    });

  };

  filterStringField = (field) => {
    return field.type === 'string';
  };

  _renderSingleFieldSelect() {

    if (!this.state.indexPattern) {
      // return null;
    }

    const onFieldChange = (fieldName) => {
      this.setState({
        selectedStringField: fieldName
      });

      this.props.onSelection({
        indexPatternId: this.state.indexPatternId,
        indexPatternTitle: this.state.indexPattern.title,
        term: fieldName
      });
    };

    return (
      <SingleFieldSelect
        placeholder="Select field"
        value={this.state.selectedStringField}
        onChange={onFieldChange}
        filterField={this.filterStringField}
        fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
      />
    );
  }

  render() {

    const termFieldSelect = this._renderSingleFieldSelect();

    if (this.props.seedSelection) {
      if (!this.state.indexPatternId) {
        this.state.indexPatternId = this.props.seedSelection.indexPatternId;
        this._onIndexPatternSelect(this.state.indexPatternId);
      }
      if (!this.state.selectedStringField) {
        this.state.selectedStringField = this.props.seedSelection.term;
      }
    }

    return (
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <IndexPatternSelect
            placeholder="Select index pattern"
            indexPatternId={this.state.indexPatternId}
            onChange={this._onIndexPatternSelect}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {termFieldSelect}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
