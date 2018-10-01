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

import _ from 'lodash';

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
      stringField: '',
      selectedFields: []
    };
  }

  _onIndexPatternSelect = (indexPatternId) => {
    this.setState({
      indexPatternId,
    }, this._loadIndexPattern(indexPatternId));
    this.props.onSelection({
      indexPatternId: indexPatternId
    });
  };

  _loadIndexPattern = (indexPatternId) => {
    this.setState({
      isLoadingIndexPattern: true,
      indexPattern: undefined,
      stringField: undefined,
    }, this._debouncedLoad.bind(null, indexPatternId));
  };

  _debouncedLoad = _.debounce(async (indexPatternId) => {
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
      indexPattern: indexPattern,
      indexPatternId: indexPatternId
    });
  }, 300);

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <IndexPatternSelect
            indexPatternId={this.state.indexPatternId}
            onChange={this._onIndexPatternSelect}
            placeholder="Select index pattern"
          />
        </EuiFlexItem>
        <EuiFlexItem/>
      </EuiFlexGroup>
    );
  }
}
