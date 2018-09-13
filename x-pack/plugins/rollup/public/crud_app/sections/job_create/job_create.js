/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import mapValues from 'lodash/object/mapValues';
import cloneDeep from 'lodash/lang/cloneDeep';
import debounce from 'lodash/function/debounce';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiBreadcrumbs,
  EuiCallOut,
  EuiLoadingKibana,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import {
  getRouterLinkProps,
  validateIndexPattern,
  formatFields,
} from '../../services';

import { Navigation } from './navigation';
import {
  StepLogistics,
  StepDateHistogram,
  StepTerms,
  StepHistogram,
  StepMetrics,
  StepReview,
} from './steps';
import {
  STEP_LOGISTICS,
  STEP_DATE_HISTOGRAM,
  STEP_TERMS,
  STEP_HISTOGRAM,
  STEP_METRICS,
  STEP_REVIEW,
  stepIds,
  stepIdToStepConfigMap,
} from './steps_config';

const stepIdToTitleMap = {
  [STEP_LOGISTICS]: 'Logistics',
  [STEP_DATE_HISTOGRAM]: 'Date histogram',
  [STEP_TERMS]: 'Terms',
  [STEP_HISTOGRAM]: 'Histogram',
  [STEP_METRICS]: 'Metrics',
  [STEP_REVIEW]: 'Review and save',
};

export class JobCreateUi extends Component {
  static propTypes = {
    createJob: PropTypes.func,
    isSaving: PropTypes.bool,
    createJobError: PropTypes.node,
  }

  constructor(props) {
    super(props);

    const stepsFields = mapValues(stepIdToStepConfigMap, step => cloneDeep(step.defaultFields || {}));

    this.state = {
      checkpointStepId: stepIds[0],
      currentStepId: stepIds[0],
      nextStepId: stepIds[1],
      previousStepId: undefined,
      stepsFieldErrors: this.getStepsFieldsErrors(stepsFields),
      stepsFieldErrorsAsync: {},
      areStepErrorsVisible: false,
      stepsFields,
      isValidatingIndexPattern: false,
      indexPatternAsyncErrors: undefined,
      indexPatternDateFields: [],
      indexPatternTermsFields: [],
      indexPatternHistogramFields: [],
      indexPatternMetricsFields: [],
    };

    this.lastIndexPatternValidationTime = 0;
  }

  componentDidUpdate(prevProps, prevState) {
    const indexPattern = this.getIndexPattern();
    if (indexPattern !== this.getIndexPattern(prevState)) {

      // If the user hasn't entered anything, then skip validation.
      if (!indexPattern || !indexPattern.trim()) {
        this.setState({
          indexPatternAsyncErrors: undefined,
          indexPatternDateFields: [],
          isValidatingIndexPattern: false,
        });

        return;
      }

      // Set the state outside of `requestIndexPatternValidation`, because that function is
      // debounced.
      this.setState({
        isValidatingIndexPattern: true,
      });

      this.requestIndexPatternValidation();
    }
  }

  componentWillUnmount() {
    // Clean up after ourselves.
    this.props.clearCreateJobErrors();
  }

  requestIndexPatternValidation = debounce(() => {
    const indexPattern = this.getIndexPattern();

    const lastIndexPatternValidationTime = this.lastIndexPatternValidationTime = Date.now();
    validateIndexPattern(indexPattern).then(response => {
      // Ignore all responses except that to the most recent request.
      if (lastIndexPatternValidationTime !== this.lastIndexPatternValidationTime) {
        return;
      }

      const {
        doesMatchIndices: doesIndexPatternMatchIndices,
        doesMatchRollupIndices: doesIndexPatternMatchRollupIndices,
        dateFields: indexPatternDateFields,
        numericFields,
        keywordFields,
      } = response.data;

      let indexPatternAsyncErrors;

      if (doesIndexPatternMatchRollupIndices) {
        indexPatternAsyncErrors = [(
          <FormattedMessage
            id="xpack.rollupJobs.create.errors.indexPatternMatchesRollupIndices"
            defaultMessage="Index pattern must not match rollup indices"
          />
        )];
      } else if (!doesIndexPatternMatchIndices) {
        indexPatternAsyncErrors = [(
          <FormattedMessage
            id="xpack.rollupJobs.create.errors.indexPatternNoMatchingIndices"
            defaultMessage="Index pattern must match at least one non-rollup index"
          />
        )];
      } else if (!indexPatternDateFields.length) {
        indexPatternAsyncErrors = [(
          <FormattedMessage
            id="xpack.rollupJobs.create.errors.indexPatternNoTimeFields"
            defaultMessage="Index pattern must match indices that contain time fields"
          />
        )];
      }

      const formattedNumericFields = formatFields(numericFields, 'numeric');
      const formattedKeywordFields = formatFields(keywordFields, 'keyword');

      function sortFields(a, b) {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }

        if (nameA > nameB) {
          return 1;
        }

        return 0;
      }

      const indexPatternTermsFields = [
        ...formattedNumericFields,
        ...formattedKeywordFields,
      ].sort(sortFields);

      const indexPatternHistogramFields = [ ...formattedNumericFields ].sort(sortFields);
      const indexPatternMetricsFields = [ ...formattedNumericFields ].sort(sortFields);

      this.setState({
        indexPatternAsyncErrors,
        indexPatternDateFields,
        indexPatternTermsFields,
        indexPatternHistogramFields,
        indexPatternMetricsFields,
        isValidatingIndexPattern: false,
      });

      // Select first time field by default.
      this.onFieldsChange({
        dateHistogramField: indexPatternDateFields.length ? indexPatternDateFields[0] : null,
      }, STEP_DATE_HISTOGRAM);
    }).catch(() => {
      // Ignore all responses except that to the most recent request.
      if (lastIndexPatternValidationTime !== this.lastIndexPatternValidationTime) {
        return;
      }

      // TODO: Show toast or inline error.
      this.setState({
        isValidatingIndexPattern: false,
      });
    });
  }, 300);

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
        areStepErrorsVisible: true,
      });
      return;
    }

    const currentStepIndex = stepIds.indexOf(stepId);

    this.setState({
      currentStepId: stepId,
      nextStepId: stepIds[currentStepIndex + 1],
      previousStepId: stepIds[currentStepIndex - 1],
      areStepErrorsVisible: false,
      isSaving: false,
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
    const {
      indexPatternAsyncErrors,
      stepsFieldErrors,
    } = this.state;

    if (stepId === STEP_LOGISTICS) {
      if (Boolean(indexPatternAsyncErrors)) {
        return true;
      }
    }

    const stepFieldErrors = stepsFieldErrors[stepId];
    return Object.values(stepFieldErrors).some(error => error != null);
  }

  getStepsFieldsErrors(newStepsFields) {
    return Object.keys(newStepsFields).reduce((stepsFieldErrors, stepId) => {
      const stepFields = newStepsFields[stepId];
      const fieldsValidator = stepIdToStepConfigMap[stepId].fieldsValidator;
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
        [STEP_LOGISTICS]: {
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
        [STEP_TERMS]: {
          terms,
        },
        [STEP_HISTOGRAM]: {
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

  getIndexPattern(state = this.state) {
    return state.stepsFields[STEP_LOGISTICS].indexPattern;
  }

  save = () => {
    const { createJob } = this.props;
    const jobConfig = this.getAllFields();

    createJob(jobConfig);
  };

  render() {
    const { isSaving, saveError } = this.props;

    const breadcrumbs = [{
      text: (
        <FormattedMessage
          id="xpack.rollupJobs.create.breadcrumbs.jobs"
          defaultMessage="Rollup jobs"
        />
      ),
      ...getRouterLinkProps(CRUD_APP_BASE_PATH),
    }, {
      text: (
        <FormattedMessage
          id="xpack.rollupJobs.create.breadcrumbs.create"
          defaultMessage="Create"
        />
      ),
    }];

    let savingFeedback;

    if (isSaving) {
      savingFeedback = (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl"/>
        </EuiOverlayMask>
      );
    }

    let saveErrorFeedback;

    if (saveError) {
      saveErrorFeedback = (
        <Fragment>
          <EuiCallOut
            title={saveError}
            icon="cross"
            color="danger"
          />

          <EuiSpacer />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent
              horizontalPosition="center"
              className="rollupJobWizardPage"
            >
              <EuiBreadcrumbs breadcrumbs={breadcrumbs} responsive={false} />
              <EuiSpacer size="xs" />

              <EuiPageContentHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.rollupJobs.create.title"
                      defaultMessage="Create rollup job"
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeader>

              {saveErrorFeedback}

              <EuiStepsHorizontal steps={this.getSteps()} />

              <EuiSpacer />

              {this.renderCurrentStep()}

              <EuiSpacer size="l" />

              {this.renderNavigation()}
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>

        {savingFeedback}
      </Fragment>
    );
  }

  renderCurrentStep() {
    const {
      currentStepId,
      stepsFields,
      stepsFieldErrors,
      areStepErrorsVisible,
      isValidatingIndexPattern,
      indexPatternDateFields,
      indexPatternAsyncErrors,
      indexPatternTermsFields,
      indexPatternHistogramFields,
      indexPatternMetricsFields,
    } = this.state;

    const currentStepFields = stepsFields[currentStepId];
    const currentStepFieldErrors = stepsFieldErrors[currentStepId];

    switch (currentStepId) {
      case STEP_LOGISTICS:
        return (
          <StepLogistics
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            areStepErrorsVisible={areStepErrorsVisible}
            isValidatingIndexPattern={isValidatingIndexPattern}
            indexPatternAsyncErrors={indexPatternAsyncErrors}
          />
        );

      case STEP_DATE_HISTOGRAM:
        return (
          <StepDateHistogram
            indexPattern={this.getIndexPattern()}
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            areStepErrorsVisible={areStepErrorsVisible}
            dateFields={indexPatternDateFields}
          />
        );

      case STEP_TERMS:
        return (
          <StepTerms
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            termsFields={indexPatternTermsFields}
          />
        );

      case STEP_HISTOGRAM:
        return (
          <StepHistogram
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            areStepErrorsVisible={areStepErrorsVisible}
            histogramFields={indexPatternHistogramFields}
          />
        );

      case STEP_METRICS:
        return (
          <StepMetrics
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            metricsFields={indexPatternMetricsFields}
          />
        );

      case STEP_REVIEW:
        return (
          <StepReview
            job={this.getAllFields()}
          />
        );

      default:
        return null;
    }
  }

  renderNavigation() {
    const {
      isValidatingIndexPattern,
      nextStepId,
      previousStepId,
      areStepErrorsVisible,
    } = this.state;

    const { isSaving } = this.props;
    const hasNextStep = nextStepId != null;

    // Users can click the next step button as long as validation hasn't executed, and as long
    // as we're not waiting on async validation to complete.
    const canGoToNextStep =
      !isValidatingIndexPattern
      && hasNextStep
      && (!areStepErrorsVisible || this.canGoToStep(nextStepId));

    return (
      <Navigation
        isSaving={isSaving}
        hasNextStep={hasNextStep}
        hasPreviousStep={previousStepId != null}
        goToNextStep={this.goToNextStep}
        goToPreviousStep={this.goToPreviousStep}
        canGoToNextStep={canGoToNextStep}
        save={this.save}
      />
    );
  }
}

export const JobCreate = injectI18n(JobCreateUi);
