/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {  } from 'react';

import {
  EuiFlexItem,
  EuiFlexGroup
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
      isLoadingIndexPattern: false,
      indexPatternId: '',
      selectedStringField: '',
      term: '',
      stringFields: []
    };
  }

  _onIndexPatternSelect = async (indexPatternId) => {

    this.setState({
      indexPatternId: indexPatternId
    });

    const indexPattern = await indexPatternService.get(indexPatternId);

    const stringFields = indexPattern.fields.byType.string;
    this.setState({
      indexPatternId: indexPatternId,
      indexPattern: indexPattern,
      stringFields: stringFields
    });

    this.props.onSelection({
      indexPatternId: indexPatternId,
    });
  };

  filterStringField = (field) => {
    return ['string'].includes(field.type);
  };

  _renderSingleFieldSelect() {

    if (!this.state.indexPattern) {
      return null;
    }

    const onFieldChange = (fieldName) => {
      this.setState({
        selectedStringField: fieldName
      });
    };

    return (<SingleFieldSelect
      placeholder="Select geo field"
      value={this.state.selectedStringField}
      onChange={onFieldChange}
      filterField={this.filterStringField}
      fields={this.state.indexPattern ? this.state.indexPattern.fields : undefined}
    />);
  }

  render() {


    const termFieldSelect = this._renderSingleFieldSelect();

    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <IndexPatternSelect
            indexPatternId={this.state.indexPatternId}
            onChange={this._onIndexPatternSelect}
            placeholder="Select index pattern"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          {termFieldSelect}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
