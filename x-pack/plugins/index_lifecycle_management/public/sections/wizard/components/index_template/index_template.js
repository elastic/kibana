/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { TemplateSelection } from './components/template_selection';
import { Configuration } from './components/configuration';

import {
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiButton
} from '@elastic/eui';
import { hasErrors } from '../../../../lib/find_errors';
import { STRUCTURE_TEMPLATE_SELECTION, STRUCTURE_CONFIGURATION } from '../../../../store/constants';

export class IndexTemplate extends Component {
  static propTypes = {
    done: PropTypes.func.isRequired,

    errors: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowingErrors: false
    };
  }

  validate = async () => {
    await this.props.validate();
    const noErrors = !hasErrors(this.props.errors);
    return noErrors;
  }

  submit = async () => {
    this.setState({ isShowingErrors: true });
    if (await this.validate()) {
      this.props.done();
    }
  }

  render() {
    const { errors } = this.props;
    const { isShowingErrors } = this.state;

    return (
      <div className="euiAnimateContentLoad">
        <EuiTitle>
          <h4>Select a template</h4>
        </EuiTitle>
        <EuiSpacer />
        <TemplateSelection
          validate={this.validate}
          errors={errors[STRUCTURE_TEMPLATE_SELECTION]}
          isShowingErrors={isShowingErrors}
        />
        <Configuration
          validate={this.validate}
          errors={errors[STRUCTURE_CONFIGURATION]}
          isShowingErrors={isShowingErrors}
        />
        <EuiHorizontalRule className="ilmHrule" />

        <EuiButton
          fill
          iconSide="right"
          iconType="sortRight"
          onClick={this.submit}
        >
          Next
        </EuiButton>
      </div>
    );
  }
}
