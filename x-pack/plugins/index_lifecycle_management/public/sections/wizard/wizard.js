/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';
import { IndexTemplate } from './components/index_template';
import { PolicyConfiguration } from './components/policy_configuration';
import { Review } from './components/review';
import { goToPolicyList } from '../../services/navigation';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
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

const STEP_INDEX_TEMPLATE = 1;
const STEP_POLICY_CONFIGURATION = 2;
const STEP_REVIEW = 3;
export class WizardUi extends Component {
  static propTypes = {
    saveLifecycle: PropTypes.func.isRequired,
    validateLifecycle: PropTypes.func.isRequired,

    indexTemplatePatch: PropTypes.object.isRequired,
    bootstrapEnabled: PropTypes.bool.isRequired,
    indexName: PropTypes.string.isRequired,
    aliasName: PropTypes.string.isRequired,
    fetchIndexTemplates: PropTypes.func.isRequired,
    indexTemplates: PropTypes.array,
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedStep: STEP_INDEX_TEMPLATE,
      errors: this.getErrors(),
    };
  }
  componentDidMount() {
    this.props.fetchIndexTemplates();
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
    const lifecycleSuccess = await this.props.saveLifecycle(lifecycle, this.props.indexTemplatePatch);
    if (!lifecycleSuccess) {
      return;
    }
    const bootstrapSuccess = await this.bootstrap();
    if (bootstrapSuccess) {
      goToPolicyList();
    }
  };

  bootstrap = async () => {
    const { indexName, aliasName, bootstrapEnabled, intl } = this.props;
    if (!bootstrapEnabled) {
      return true;
    }

    const bootstrapSuccess = await bootstrap(indexName, aliasName);
    if (bootstrapSuccess) {
      toastNotifications.addSuccess(
        intl.formatMessage({
          id: 'xpack.indexLifecycleMgmt.wizard.bootstrapSuccess',
          defaultMessage: 'Successfully bootstrapped an index and alias',
        })
      );
      // Bounce back to management
      // this.onSelectedStepChanged(1);
      // TODO: also clear state?
    } else {
      toastNotifications.addDanger(
        intl.formatMessage({
          id: 'xpack.indexLifecycleMgmt.wizard.bootstrapFailure',
          defaultMessage: 'Unable to bootstrap an index and alias',
        })
      );
    }
    return bootstrapSuccess;
  };

  renderContent() {
    const { selectedStep, errors } = this.state;

    switch (selectedStep) {
      case STEP_INDEX_TEMPLATE:
        return (
          <IndexTemplate
            validate={this.validate}
            errors={errors[STRUCTURE_INDEX_TEMPLATE]}
            done={() => this.onSelectedStepChanged(selectedStep + 1)}
          />
        );
      case STEP_POLICY_CONFIGURATION:
        return (
          <PolicyConfiguration
            validate={this.validate}
            errors={errors[STRUCTURE_POLICY_CONFIGURATION]}
            done={() => this.onSelectedStepChanged(selectedStep + 1)}
            back={() => this.onSelectedStepChanged(selectedStep - 1)}
          />
        );
      case STEP_REVIEW:
        return (
          <Review
            validate={this.validate}
            done={this.addLifecycle}
            errors={errors[STRUCTURE_REVIEW]}
            back={() => this.onSelectedStepChanged(selectedStep - 1)}
          />
        );
    }
  }
  createStep(title, stepIndex) {
    return {
      title,
      isSelected: this.state.selectedStep === stepIndex,
      isComplete: this.state.selectedStep > stepIndex,
      onClick: () => this.onSelectedStepChanged(stepIndex),
    };
  }
  render() {
    const { indexTemplates, intl } = this.props;
    if (indexTemplates === null) {
      // Loading...
      return null;
    }

    if (indexTemplates.length === 0) {
      return (
        <h1>No index templates found.</h1>
      );
    }
    const steps = [
      this.createStep(intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.wizard.selectIndexTemplateStepTitle',
        defaultMessage: 'Select an index template',
      }), STEP_INDEX_TEMPLATE),
      this.createStep(intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.wizard.configurePolicyStepTitle',
        defaultMessage: 'Configure a lifecycle policy',
      }), STEP_POLICY_CONFIGURATION),
      this.createStep(intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.wizard.reviewStepTitle',
        defaultMessage: 'Review and save',
      }), STEP_REVIEW),
    ];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent verticalPosition="center" horizontalPosition="center" className="ilmContent">
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.wizard.title"
                  defaultMessage="Index lifecycle management"
                />
              </h2>
            </EuiTitle>
            <EuiSpacer />
            <EuiStepsHorizontal steps={steps} />

            <EuiSpacer />
            {this.renderContent()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
export const Wizard = injectI18n(WizardUi);

