/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { IndexTemplate } from './components/index_template';
// import { PolicySelection } from './components/policy_selection';
import { PolicyConfiguration } from './components/policy_configuration';
import { Review } from './components/review';
import {
  EuiPage,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiStepsHorizontal,
} from '@elastic/eui';
import { bootstrap } from '../../api';
import {
  STRUCTURE_INDEX_TEMPLATE,
  STRUCTURE_POLICY_CONFIGURATION,
  STRUCTURE_REVIEW,
} from '../../store/constants';
// import { DiffView } from './components/review/diff_view';
// import diff from './diff.json';

export class Wizard extends Component {
  static propTypes = {
    saveLifecycle: PropTypes.func.isRequired,
    validateLifecycle: PropTypes.func.isRequired,

    indexTemplatePatch: PropTypes.object.isRequired,
    bootstrapEnabled: PropTypes.bool.isRequired,
    indexName: PropTypes.string.isRequired,
    aliasName: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedStep: 1,
      errors: this.getErrors(),
    };
  }

  onSelectedStepChanged = selectedStep => {
    this.setState({
      selectedStep,
    });
  };

  getErrors = () => {
    return this.props.validateLifecycle();
  };

  validate = () => {
    const errors = this.getErrors();
    this.setState({ errors });
  };

  addLifecycle = async lifecycle => {
    await this.props.saveLifecycle(lifecycle, this.props.indexTemplatePatch);
    await this.bootstrap();
    // this.onSelectedStepChanged(5);
  };

  bootstrap = async () => {
    const { indexName, aliasName, bootstrapEnabled } = this.props;
    if (!bootstrapEnabled) {
      return;
    }

    const response = await bootstrap(indexName, aliasName);
    if (response && response.acknowledged) {
      toastNotifications.addSuccess(
        'Successfully bootstrapped an index and alias'
      );
      // Bounce back to management
      // this.onSelectedStepChanged(1);
      // TODO: also clear state?
    } else {
      toastNotifications.addDanger('Unable to bootstrap an index and alias');
    }
  };

  renderContent() {
    const { selectedStep, errors } = this.state;

    switch (selectedStep) {
      case 1:
        return (
          <IndexTemplate
            validate={this.validate}
            errors={errors[STRUCTURE_INDEX_TEMPLATE]}
            done={() => this.onSelectedStepChanged(2)}
          />
        );
      // case 2:
      //   return (
      //     <PolicySelection
      //       done={() => this.onSelectedStepChanged(3)}
      //       back={() => this.onSelectedStepChanged(1)}
      //     />
      //   );
      case 2:
        return (
          <PolicyConfiguration
            validate={this.validate}
            errors={errors[STRUCTURE_POLICY_CONFIGURATION]}
            done={() => this.onSelectedStepChanged(3)}
            back={() => this.onSelectedStepChanged(1)}
          />
        );
      case 3:
        return (
          <Review
            validate={this.validate}
            done={this.addLifecycle}
            errors={errors[STRUCTURE_REVIEW]}
            back={() => this.onSelectedStepChanged(2)}
          />
        );
    }
  }

  render() {
    const steps = [
      {
        title: 'Select a template',
        isSelected: this.state.selectedStep === 1,
        isComplete: this.state.selectedStep > 1,
        onClick: () => this.onSelectedStepChanged(1),
      },
      // {
      //   title: 'Select or create policy',
      //   isSelected: this.state.selectedStep === 2,
      //   isComplete: this.state.selectedStep > 2,
      //   disabled: this.state.selectedStep < 2,
      //   onClick: () => this.onSelectedStepChanged(2),
      // },
      {
        title: 'Configure policy',
        isSelected: this.state.selectedStep === 2,
        isComplete: this.state.selectedStep > 2,
        disabled: this.state.selectedStep < 2,
        onClick: () => this.onSelectedStepChanged(2),
      },
      {
        title: 'Review and save',
        isSelected: this.state.selectedStep === 3,
        isComplete: this.state.selectedStep > 3,
        disabled: this.state.selectedStep < 3,
        onClick: () => this.onSelectedStepChanged(3),
      },
    ];

    // const templateDiff = diff;

    return (
      <EuiPage>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2>Index lifecycle management</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiStepsHorizontal steps={steps} />
        <EuiSpacer size="m" />
        {/* <DiffView
          templateDiff={diff}
        /> */}
        {this.renderContent()}
      </EuiPage>
    );
  }
}
