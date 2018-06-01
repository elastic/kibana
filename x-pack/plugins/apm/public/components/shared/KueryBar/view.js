/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  history,
  fromQuery,
  toQuery,
  legacyEncodeURIComponent
} from '../../../utils/url';
import { debounce } from 'lodash';

import { EuiFieldSearch } from '@elastic/eui';

import { getAPMIndexPattern } from '../../../services/rest';

import { convertKueryToEsQuery, getSuggestions } from '../../../services/kuery';
import styled from 'styled-components';

const Container = styled.div`
  margin-bottom: 10px;
`;

class KueryBarView extends Component {
  state = {
    indexPattern: null,
    inputValue: this.props.urlParams.kuery || ''
  };

  componentDidMount() {
    getAPMIndexPattern().then(indexPattern => {
      this.setState({ indexPattern });
    });
  }

  componentWillReceiveProps(nextProps) {
    const kuery = nextProps.urlParams.kuery;
    if (kuery && !this.state.inputValue) {
      this.setState({ inputValue: kuery });
    }
  }

  updateUrl = debounce(kuery => {
    const { location } = this.props;
    const { indexPattern } = this.state;

    if (!indexPattern) {
      return;
    }

    getSuggestions(kuery, indexPattern).then(
      suggestions => console.log(suggestions.map(suggestion => suggestion.text)) // eslint-disable-line no-console
    );

    try {
      const res = convertKueryToEsQuery(kuery, indexPattern);
      if (!res) {
        return;
      }

      history.replace({
        ...location,
        search: fromQuery({
          ...toQuery(this.props.location.search),
          kuery: legacyEncodeURIComponent(kuery)
        })
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }, 200);

  onChange = event => {
    const kuery = event.target.value;
    this.setState({ inputValue: kuery });
    this.updateUrl(kuery);
  };

  render() {
    return (
      <Container>
        <EuiFieldSearch
          placeholder="Search... (Example: transaction.duration.us > 10000)"
          fullWidth
          onChange={this.onChange}
          value={this.state.inputValue}
        />
      </Container>
    );
  }
}

KueryBarView.propTypes = {
  location: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};

export default KueryBarView;
