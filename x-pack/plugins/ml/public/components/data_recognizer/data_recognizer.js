/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import PropTypes from 'prop-types';

import React, { Component } from 'react';
import { RecognizedResult } from './recognized_result';

export function dataRecognizerProvider(ml) {

  class DataRecognizer extends Component {
    constructor(props) {
      super(props);

      this.state = {
        results: []
      };

      this.indexPattern = props.indexPattern;
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
            />
          ));
          if (typeof this.results === 'object') {
            this.results.count = results.length;
          }

          this.setState({
            results
          });
        });
    }

    render() {
      return (
        <div className={this.className}>
          {this.state.results}
        </div>
      );
    }
  }

  DataRecognizer.propTypes = {
    indexPattern: PropTypes.object,
    className: PropTypes.string,
    results: PropTypes.object,
  };

  return DataRecognizer;
}
