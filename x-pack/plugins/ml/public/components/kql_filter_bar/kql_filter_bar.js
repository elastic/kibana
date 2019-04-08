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
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { getSuggestions } from './utils';


function convertKueryToEsQuery(kuery, indexPattern) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}
export class KqlFilterBar extends Component {
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
      console.error('Error while fetching suggestions', e);
      const errorMessage = i18n.translate('xpack.ml.explorer.fetchingSuggestionsErrorMessage', {
        defaultMessage: 'Error while fetching suggestions'
      });
      this.setState({ isLoadingSuggestions: false, error: (e.message ? e.message : errorMessage) });
    }
  };

  onSubmit = inputValue => {
    const { indexPattern } = this.props;
    const { onSubmit } = this.props;
    const filteredFields = [];

    try {
      const ast = fromKueryExpression(inputValue);
      const isAndOperator = (ast.function === 'and');
      const query = convertKueryToEsQuery(inputValue, indexPattern);

      if (!query) {
        return;
      }

      // if ast.type == 'function' then layout of ast.arguments:
      // [{ arguments: [ { type: 'literal', value: 'AAL' } ] },{ arguments: [ { type: 'literal', value: 'AAL' } ] }]
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
      const errorMessage = i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessage', {
        defaultMessage: 'Invalid kuery syntax'
      });
      this.setState({ error: (e.message ? e.message : errorMessage) });
    }
  };

  render() {
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

KqlFilterBar.propTypes = {
  indexPattern: PropTypes.object.isRequired,
  initialValue: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  placeholder: PropTypes.string
};

