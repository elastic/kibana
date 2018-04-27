/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Wizard } from '../wizard';

export class Landing extends PureComponent {
  static propTypes = {
    fetchIndexTemplates: PropTypes.func.isRequired,

    indexTemplates: PropTypes.array,
  }

  componentWillMount() {
    this.props.fetchIndexTemplates();
  }

  render() {
    const { indexTemplates } = this.props;

    if (indexTemplates === null) {
      // Loading...
      return null;
    }

    if (indexTemplates.length === 0) {
      return (
        <h1>No index templates found.</h1>
      );
    }

    return (
      <Wizard/>
    );
  }
}
