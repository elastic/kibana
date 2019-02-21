/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { uniqueId } from 'lodash';
import { FilterBar } from './filter_bar';
import { EuiCallOut } from '@elastic/eui';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query'; // luceneStringToDsl
import { getAutocompleteProvider } from 'ui/autocomplete_providers';

function convertKueryToEsQuery(kuery, indexPattern) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}

async function getSuggestions(
  query,
  selectionStart,
  indexPattern,
  boolFilter
) {
  const autocompleteProvider = getAutocompleteProvider('kuery');
  if (!autocompleteProvider) {
    return [];
  }
  const config = {
    get: () => true
  };

  const getAutocompleteSuggestions = autocompleteProvider({
    config,
    indexPatterns: [indexPattern],
    boolFilter
  });
  return getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart
  });
}

export class KueryFilterBar extends Component {
  state = {
    error: null,
    suggestions: [],
    isLoadingSuggestions: false,
    isLoadingIndexPattern: true,
  };

  onChange = async (inputValue, selectionStart) => {
    const { indexPattern } = this.props;

    this.setState({ error: null, suggestions: [], isLoadingSuggestions: true });

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
      this.setState({ isLoadingSuggestions: false, error: (e.message ? e.message : 'Error while fetching suggestions') });
    }
  };

  onSubmit = inputValue => {
    const { indexPattern } = this.state;
    const { onSubmit } = this.props;
    const filteredFields = [];

    try {
      const ast = fromKueryExpression(inputValue); // ast.function = 'and'
      const isAndOperator = ast.function === 'and';
      const query = convertKueryToEsQuery(inputValue, indexPattern);

      if (!query) {
        return;
      }
      // TODO: do some cleanup on what gets returned in this array (Remove bools, etc) - is there a better way to determine maskAll?
      // Test that all relevant values get returned ( only if arg.type is literal? dig in more*)
      // if ast.type == 'function' then layout is:
      // ast.arguments = [ { arguments: [ { type: 'literal', value: 'AAL' } ] }, { arguments: [ { type: 'literal', value: 'AAL' } ] } ]
      if (ast && Array.isArray(ast.arguments)) {

        ast.arguments.forEach((arg) => {
          if (arg.arguments !== undefined) {
            arg.arguments.forEach((nestedArg) => {
              if (typeof nestedArg.value === 'string') {
                filteredFields.push(nestedArg.value);
              }
            });
          } else if (typeof arg.value === 'string') {
            filteredFields.push(arg.value);
          }
        });

      }

      onSubmit({
        influencersFilterQuery: query,
        filteredFields,
        queryString: inputValue,
        isAndOperator
      });
    } catch (e) {
      console.log('Invalid kuery syntax', e); // eslint-disable-line no-console
      this.setState({ error: (e.message ? e.message : 'Invalid query syntax') });
    }
  };

  render() {
    // TODO: localization for error
    const { error } = this.state;
    const { initialValue, placeholder } = this.props;

    return (
      <Fragment>
        <FilterBar
          disabled={false}
          isLoading={this.state.isLoadingSuggestions}
          initialValue={initialValue || ''}
          onChange={this.onChange}
          placeholder={placeholder}
          onSubmit={this.onSubmit}
          suggestions={this.state.suggestions}
        />
        { error &&
          <EuiCallOut color="danger">
            {error}
          </EuiCallOut>}
      </Fragment>
    );
  }
}

KueryFilterBar.propTypes = {
  indexPattern: PropTypes.object.isRequired,
  initialValue: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  placeholder: PropTypes.string
};

