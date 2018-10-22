/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { uniqueId, startsWith } from 'lodash';
import { EuiCallOut } from '@elastic/eui';
import {
  history,
  fromQuery,
  toQuery,
  legacyEncodeURIComponent,
  KibanaLink
} from '../../../utils/url';
import { Typeahead } from './Typeahead';
import { getAPMIndexPattern } from '../../../services/rest/savedObjects';
import { convertKueryToEsQuery, getSuggestions } from '../../../services/kuery';
import styled from 'styled-components';

import { getBoolFilter } from './get_bool_filter';

const Container = styled.div`
  margin-bottom: 10px;
`;

class KueryBarView extends Component {
  state = {
    indexPattern: null,
    suggestions: [],
    isLoadingIndexPattern: true,
    isLoadingSuggestions: false
  };

  async componentDidMount() {
    const indexPattern = await getAPMIndexPattern();
    this.setState({ indexPattern, isLoadingIndexPattern: false });
  }

  onChange = async (inputValue, selectionStart) => {
    const { indexPattern } = this.state;
    const { urlParams } = this.props;
    this.setState({ suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    this.currentRequest = currentRequest;

    const boolFilter = getBoolFilter(urlParams);
    try {
      const suggestions = (await getSuggestions(
        inputValue,
        selectionStart,
        indexPattern,
        boolFilter
      )).filter(suggestion => !startsWith(suggestion.text, 'span.'));

      if (currentRequest !== this.currentRequest) {
        return;
      }

      this.setState({ suggestions, isLoadingSuggestions: false });
    } catch (e) {
      console.error('Error while fetching suggestions', e);
    }
  };

  onSubmit = inputValue => {
    const { indexPattern } = this.state;
    const { location } = this.props;
    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      history.replace({
        ...location,
        search: fromQuery({
          ...toQuery(this.props.location.search),
          kuery: legacyEncodeURIComponent(inputValue.trim())
        })
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  };

  render() {
    const indexPatternMissing =
      !this.state.isLoadingIndexPattern && !this.state.indexPattern;

    return (
      <Container>
        <Typeahead
          disabled={indexPatternMissing}
          isLoading={this.state.isLoadingSuggestions}
          initialValue={this.props.urlParams.kuery}
          onChange={this.onChange}
          onSubmit={this.onSubmit}
          suggestions={this.state.suggestions}
        />

        {indexPatternMissing && (
          <EuiCallOut
            style={{ display: 'inline-block', marginTop: '10px' }}
            title={
              <div>
                There&#39;s no APM index pattern available. To use the Query
                bar, please choose to import the APM index pattern in the{' '}
                <KibanaLink
                  pathname={'/app/kibana'}
                  hash={`/home/tutorial/apm`}
                >
                  Setup Instructions.
                </KibanaLink>
              </div>
            }
            color="warning"
            iconType="alert"
            size="s"
          />
        )}
      </Container>
    );
  }
}

KueryBarView.propTypes = {
  location: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};

export default KueryBarView;
