/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { context } from '@kbn/kibana-react-plugin/public';

import { RecognizedResult } from './recognized_result';

export class DataRecognizer extends Component {
  static contextType = context;

  constructor(props) {
    super(props);

    this.state = {
      results: [],
    };

    this.indexPattern = props.indexPattern;
    this.savedSearch = props.savedSearch;
    this.className = props.className;
    this.results = props.results;
  }

  componentDidMount() {
    const mlApi = this.context.services.mlServices.mlApi;
    // once the mount is complete, call the recognize endpoint to see if the index format is known to us,
    mlApi
      .recognizeIndex({ indexPatternTitle: this.indexPattern.title })
      .then((resp) => {
        // Sort results by title prior to display
        resp.sort((res1, res2) => res1.title.localeCompare(res2.title));

        const results = resp.map((r) => (
          <RecognizedResult
            key={r.id}
            config={r}
            indexPattern={this.indexPattern}
            savedSearch={this.savedSearch}
          />
        ));
        if (typeof this.results === 'object') {
          this.results.count = results.length;
          if (typeof this.results.onChange === 'function') {
            this.results.onChange();
          }
        }

        this.setState({
          results,
        });
      })
      .catch((e) => {
        console.error('Error attempting to recognize index', e);
      });
  }

  render() {
    return <>{this.state.results}</>;
  }
}

DataRecognizer.propTypes = {
  indexPattern: PropTypes.object,
  savedSearch: PropTypes.object,
  className: PropTypes.string,
  results: PropTypes.object,
};
