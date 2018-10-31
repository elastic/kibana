/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';


import {
  EuiText,
} from '@elastic/eui';

export class ESSourceDetails extends React.Component {

  constructor() {
    super();
    this.state = {
      indexPatternTitle: ""
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.props.source.getDisplayName().then((name) => {
      if (this._isMounted) {
        this.setState({
          indexPatternTitle: name
        });
      }
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    return (
      <EuiText color="subdued" size="s">
        <p className="gisLayerDetails">
          <strong className="gisLayerDetails__label">Type: </strong><span>{this.props.sourceType}</span><br/>
          <strong className="gisLayerDetails__label">Index pattern: </strong><span>{this.state.indexPatternTitle}</span><br/>
          <strong className="gisLayerDetails__label">{this.props.geoFieldType}</strong><span>{this.props.geoField}</span><br/>
        </p>
      </EuiText>
    );

  }
}
