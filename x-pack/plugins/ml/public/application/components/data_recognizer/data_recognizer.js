/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';

import React, { Component } from 'react';
import { RecognizedResult } from './recognized_result';

import { ml } from '../../services/ml_api_service';

export class DataRecognizer extends Component {
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
    // once the mount is complete, call the recognize endpoint to see if the index format is known to us,
    ml.recognizeIndex({ indexPatternTitle: this.indexPattern.title })
      .then((resp) => {
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
