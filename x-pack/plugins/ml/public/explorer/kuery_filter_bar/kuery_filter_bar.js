/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { FilterBar } from './filter_bar';
import {
  convertKueryToEsQuery,
  getSuggestions,
} from '../../../../apm/public/services/kuery';
import { fromKueryExpression } from '@kbn/es-query'; // toElasticsearchQuery

export class KueryFilterBar extends Component {
  state = {
    suggestions: [],
    isLoadingSuggestions: false,
    isLoadingIndexPattern: true,
  };

  onChange = async (inputValue, selectionStart) => {
    const { indexPattern } = this.props;

    this.setState({ suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    this.currentRequest = currentRequest;
    // TODO: boolFilter for when we want to load existing filter from url
    const boolFilter = [];

    try {
      const suggestions = (await getSuggestions(
        inputValue,
        selectionStart,
        indexPattern,
        boolFilter
      ));

      if (currentRequest !== this.currentRequest) {
        return;
      }

      this.setState({ suggestions, isLoadingSuggestions: false });
    } catch (e) {
      // TODO: callout or toast for error
      console.error('Error while fetching suggestions', e);
    }
  };

  onSubmit = inputValue => {
    const { indexPattern } = this.state;
    const { onSubmit } = this.props;
    let filteredFields = [];

    try {
      const ast = fromKueryExpression(inputValue);
      const query = convertKueryToEsQuery(inputValue, indexPattern);

      if (!query) {
        return;
      }
      // TODO: do some cleanup on what gets returned in this array (Remove bools, etc)
      // Test that all relevant values get returned
      if (ast && Array.isArray(ast.arguments)) {
        filteredFields = ast.arguments.map(arg => {
          if (typeof arg.value === 'string') {
            return arg.value;
          }
        });
      }

      onSubmit(query, filteredFields);
    } catch (e) {
      console.log('Invalid kuery syntax', e); // eslint-disable-line no-console
    }
  };

  render() {
    return (
      <div className="mlAnomalyExploer__filterBar">
        <FilterBar
          disabled={false}
          isLoading={this.state.isLoadingSuggestions}
          initialValue={''}
          onChange={this.onChange}
          onSubmit={this.onSubmit}
          suggestions={this.state.suggestions}
        />
      </div>
    );
  }
}

KueryFilterBar.propTypes = {
  indexPattern: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired
};

