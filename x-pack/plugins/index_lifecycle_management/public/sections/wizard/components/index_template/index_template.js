/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';

import { TemplateSelection } from './components/template_selection';
import { Configuration } from './components/configuration';

import {
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiButton,
  EuiTextColor,
  EuiLink,
} from '@elastic/eui';
import { hasErrors } from '../../../../lib/find_errors';
import {
  STRUCTURE_TEMPLATE_SELECTION,
  STRUCTURE_CONFIGURATION,
} from '../../../../store/constants';

export class IndexTemplate extends Component {
  static propTypes = {
    done: PropTypes.func.isRequired,

    errors: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowingErrors: false,
    };
  }

  validate = async () => {
    await this.props.validate();
    const noErrors = !hasErrors(this.props.errors);
    return noErrors;
  };

  submit = async () => {
    this.setState({ isShowingErrors: true });
    if (await this.validate()) {
      this.props.done();
    } else {
      toastNotifications.addDanger('Please fix errors on the page.');
    }
  };

  render() {
    const { errors } = this.props;
    const { isShowingErrors } = this.state;

    return (
      <div className="euiAnimateContentLoad">
        <EuiTitle>
          <h4>Select a template</h4>
        </EuiTitle>
        <EuiTitle size="xs">
          <Fragment>
            <EuiSpacer size="xs"/>
            <EuiTextColor color="subdued">
              <h5>
                An index template defines the settings, mappings, and aliases to apply
                when you create an index.
              </h5>
            </EuiTextColor>
            <EuiSpacer size="xs"/>
            <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-templates.html">
              Learn more
            </EuiLink>
          </Fragment>
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
