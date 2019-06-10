/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { JsonTooltip } from '../json_tooltip/json_tooltip';

// Component for creating a form label including a hoverable icon
// to provide additional information in a tooltip. Label and tooltip
// text elements get unique ids based on label-id so they can be
// referenced by attributes, for example:
//
// <FormLabel labelId="uid">Label Text</FormLabel>
// <input
//   type="text"
//   aria-labelledby="ml_aria_label_uid"
//   aria-describedby="ml_aria_description_uid"
// />
//
// Writing this as a class based component because stateless components
// cannot use ref(). Once angular is completely gone this can be rewritten
// as a function stateless component.
export class FormLabel extends Component {
  constructor(props) {
    super(props);
    this.labelRef = React.createRef();
  }
  render() {
    // labelClassName is used so we can override the class with 'kuiFormLabel'
    // when used in an angular context. Once the component is no longer used from
    // within angular, this prop can be removed and the className can be hardcoded.
    const { labelId, labelClassName = 'euiFormLabel', children } = this.props;
    return (
      <React.Fragment>
        <label className={labelClassName} id={`ml_aria_label_${labelId}`} ref={this.labelRef}>{children}</label>
        <JsonTooltip id={labelId} position="top" />
      </React.Fragment>
    );
  }
}
FormLabel.propTypes = {
  labelId: PropTypes.string
};
