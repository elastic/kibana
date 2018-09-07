/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { FileDataVisualizerView } from './components/file_datavisualizer_view';

import React, {
  Component
} from 'react';

export class FileDataVisualizerPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
    };
  }

  render() {
    return (
      <div className="file-datavisualizer-container">
        <FileDataVisualizerView maxPayloadBytes={this.props.maxPayloadBytes} />
      </div>
    );
  }
}
