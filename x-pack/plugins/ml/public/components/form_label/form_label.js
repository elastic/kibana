/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './styles/main.less';

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { JsonTooltip } from '../json_tooltip/json_tooltip';

// Writing this as a class based component because stateless components
// cannot use ref(). Once angular is completely gone this can be rewritten
// as a function stateless component.
export class FormLabel extends Component {
  constructor(props) {
    super(props);
    this.labelRef = React.createRef();
  }
  render() {
    const { labelId, children } = this.props;
    return (
      <React.Fragment>
        <label className="kuiFormLabel" id={`ml_aria_label_${labelId}`} ref={this.labelRef}>{children}</label>
        <JsonTooltip id={labelId} position="top" />
      </React.Fragment>
    );
  }
}
FormLabel.propTypes = {
  labelId: PropTypes.string
};
