/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isEmpty, mapValues, cloneDeep } from 'lodash';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiTitle,
  EuiStepsHorizontal,
  EuiBreadcrumbs,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../../../common/constants';
import { getRouterLinkProps } from '../../services';

import { Navigation } from './navigation';
import { StepIndices } from './step_indices';

const STEP_INDICES = 'STEP_INDICES';
const STEP_DATE_HISTOGRAM = 'STEP_DATE_HISTOGRAM';
const STEP_GROUPS = 'STEP_GROUPS';
const STEP_METRICS = 'STEP_METRICS';
const STEP_REVIEW = 'STEP_REVIEW';

const stepIds = [
  STEP_INDICES,
  STEP_DATE_HISTOGRAM,
  STEP_GROUPS,
  STEP_METRICS,
  STEP_REVIEW,
];

const stepIdToStepMap = {
  [STEP_INDICES]: {
    defaultFields: {
      id: '',
      indexPattern: '',
      rollupIndex: '',
      rollupCron: '/30 * * * * ?',
      rollupPageSize: 1000,
    },
    fieldsValidator: fields => {
      const {
        id,
        indexPattern,
        rollupIndex,
        rollupCron,
        rollupPageSize,
      } = fields;

      const errors = {};

      if (!id || !id.trim()) {
        errors.id = 'You must provide a name';
      }

      if (!indexPattern || !indexPattern.trim()) {
        errors.indexPattern = 'You must provide an index pattern';
      }

      if (!rollupIndex || !rollupIndex.trim()) {
        errors.rollupIndex = 'You must provide a rollup index';
      }

      if (!rollupCron || !rollupCron.trim()) {
        errors.rollupCron = 'You must provide an interval';
      }

      if (!rollupPageSize) {
        errors.rollupPageSize = 'You must provide a page size';
      }

      return errors;
    },
  },
  [STEP_DATE_HISTOGRAM]: {
    defaultFields: {
      dateHistogramInterval: '1h',
      dateHistogramDelay: null,
      dateHistogramTimeZone: 'UTC',
      dateHistogramField: 'utc_time',
    },
  },
  [STEP_GROUPS]: {
    defaultFields: {
      terms: ['index.keyword'],
      histogram: ['memory'],
      histogramInterval: 5,
    },
  },
  [STEP_METRICS]: {
    defaultFields: {
      metrics: [{
        'field': 'bytes',
        'metrics': ['min', 'max', 'avg']
      }, {
        'field': 'memory',
        'metrics': ['min', 'max', 'avg']
      }],
    },
  },
  [STEP_REVIEW]: {
  },
};

const stepIdToTitleMap = {
  [STEP_INDICES]: 'Indices',
  [STEP_DATE_HISTOGRAM]: 'Date histogram',
  [STEP_GROUPS]: 'Groups',
  [STEP_METRICS]: 'Metrics',
  [STEP_REVIEW]: 'Review and save',
};

export class JobCreate extends Component {
  static propTypes = {
    createJob: PropTypes.func,
    isSaving: PropTypes.bool,
  }

  constructor(props) {
    super(props);

    const stepsFields = mapValues(stepIdToStepMap, step => cloneDeep(step.defaultFields || {}));

    this.state = {
      checkpointStepId: stepIds[0],
      currentStepId: stepIds[0],
      nextStepId: stepIds[1],
      previousStepId: undefined,
      stepsFieldErrors: this.getStepsFieldsErrors(stepsFields),
      stepsFields,
    };
  }

  getSteps() {
    const { currentStepId, checkpointStepId } = this.state;
    const indexOfCurrentStep = stepIds.indexOf(currentStepId);

    return stepIds.map((stepId, index) => ({
      title: stepIdToTitleMap[stepId],
      isComplete: index < indexOfCurrentStep,
      isSelected: index === indexOfCurrentStep,
      onClick: () => this.goToStep(stepId),
      disabled: (
        !this.canGoToStep(stepId)
        || stepIds.indexOf(stepId) > stepIds.indexOf(checkpointStepId)
      ),
    }));
  }

  goToNextStep = () => {
    this.goToStep(this.state.nextStepId);
  };

  goToPreviousStep = () => {
    this.goToStep(this.state.previousStepId);
  };

  goToStep(stepId) {
    // Instead of disabling the Next button while the step is invalid, we
    // instead allow the user to click the Next button, prevent them leaving
    // this step, and render a global error message to clearly convey the
    // error.
    if (!this.canGoToStep(stepId)) {
      this.setState({
        showStepErrors: true,
      });
      return;
    }

    const currentStepIndex = stepIds.indexOf(stepId);

    this.setState({
      currentStepId: stepId,
      nextStepId: stepIds[currentStepIndex + 1],
      previousStepId: stepIds[currentStepIndex - 1],
      showStepErrors: false,
    });

    if (stepIds.indexOf(stepId) > stepIds.indexOf(this.state.checkpointStepId)) {
      this.setState({ checkpointStepId: stepId });
    }
  }

  canGoToStep(stepId) {
    const indexOfStep = stepIds.indexOf(stepId);

    // Check every step before this one and see if it's been completed.
    const prerequisiteSteps = stepIds.slice(0, indexOfStep);

    return prerequisiteSteps.every(prerequisiteStepId => !this.hasStepErrors(prerequisiteStepId));
  }

  hasStepErrors(stepId) {
    return !isEmpty(this.state.stepsFieldErrors[stepId]);
  }

  getStepsFieldsErrors(newStepsFields) {
    return Object.keys(newStepsFields).reduce((stepsFieldErrors, stepId) => {
      const stepFields = newStepsFields[stepId];
      const fieldsValidator = stepIdToStepMap[stepId].fieldsValidator;
      stepsFieldErrors[stepId] = typeof fieldsValidator === `function` ? fieldsValidator(stepFields) : {};
      return stepsFieldErrors;
    }, {});
  }

  onFieldsChange = (fields, currentStepId = this.state.currentStepId) => {
    const { stepsFields } = this.state;
    const prevFields = stepsFields[currentStepId];

    const newFields = {
      ...prevFields,
      ...fields,
    };

    const newStepsFields = {
      ...cloneDeep(stepsFields),
      [currentStepId]: newFields,
    };

    this.setState({
      stepsFields: newStepsFields,
      stepsFieldErrors: this.getStepsFieldsErrors(newStepsFields),
    });
  };

  getAllFields() {
    const {
      stepsFields: {
        [STEP_INDICES]: {
          id,
          indexPattern,
          rollupIndex,
          rollupCron,
          rollupPageSize,
        },
        [STEP_DATE_HISTOGRAM]: {
          dateHistogramInterval,
          dateHistogramDelay,
          dateHistogramTimeZone,
          dateHistogramField,
        },
        [STEP_GROUPS]: {
          terms,
          histogram,
          histogramInterval,
        },
        [STEP_METRICS]: {
          metrics,
        },
      },
    } = this.state;

    return {
      id,
      indexPattern,
      rollupIndex,
      rollupCron,
      rollupPageSize,
      dateHistogramInterval,
      dateHistogramDelay,
      dateHistogramTimeZone,
      dateHistogramField,
      terms,
      histogram,
      histogramInterval,
      metrics,
    };
  }

  save = () => {
    const { createJob } = this.props;
    const jobConfig = this.getAllFields();
    createJob(jobConfig);
  };

  render() {
    const breadcrumbs = [{
      text: 'Rollup jobs',
      ...getRouterLinkProps(CRUD_APP_BASE_PATH),
    }, {
      text: 'Create',
    }];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent horizontalPosition="center" style={{ maxWidth: 1200, width: '100%', marginTop: 16, marginBottom: 16 }}>
            <EuiBreadcrumbs breadcrumbs={breadcrumbs} responsive={false} />
            <EuiSpacer size="xs" />

            <EuiPageContentHeader>
              <EuiTitle size="l">
                <h1>Create rollup job</h1>
              </EuiTitle>
            </EuiPageContentHeader>

            <EuiStepsHorizontal steps={this.getSteps()} />

            <EuiSpacer />

            {this.renderCurrentStep()}

            <EuiSpacer size="l" />

            {this.renderNavigation()}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  renderCurrentStep() {
    const { currentStepId, stepsFields, stepsFieldErrors, showStepErrors } = this.state;
    const currentStepFields = stepsFields[currentStepId];
    const currentStepFieldErrors = stepsFieldErrors[currentStepId];

    switch (currentStepId) {
      case STEP_INDICES:
        return (
          <StepIndices
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            showStepErrors={showStepErrors}
          />
        );

      default:
        return null;
    }
  }

  renderNavigation() {
    const { nextStepId, previousStepId } = this.state;
    const { isSaving } = this.props;

    return (
      <Navigation
        isSaving={isSaving}
        hasNextStep={nextStepId != null}
        hasPreviousStep={previousStepId != null}
        goToNextStep={this.goToNextStep}
        goToPreviousStep={this.goToPreviousStep}
        save={this.save}
      />
    );
  }
}
