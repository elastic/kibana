/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import {
  EuiCallOut,
  EuiPage,
  EuiLoadingKibana,
  EuiOverlayMask,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';
import PropTypes from 'prop-types';
import { cloneDeep, mapValues } from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { withKibana } from '../../../../../../../src/plugins/kibana_react/public';

// const createBreadcrumb = {
//   text: i18n.translate('xpack.rollupJobs.createBreadcrumbTitle', {
//     defaultMessage: 'Create',
//   }),
// };

// @ts-ignore
import { Navigation } from './navigation';

import {
  StepLogistics,
  StepDateHistogram,
  StepTerms,
  StepHistogram,
  StepMetrics,
  StepReview,
  // @ts-ignore
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
  getAffectedStepsFields,
  hasErrors,
  // @ts-ignore
} from './steps_config';

// TODO: Move this lib functionality somewhere

// TODO: fix anys!

export function formatFields(fieldNames: any, type: any) {
  return fieldNames.map((fieldName: string) => ({
    name: fieldName,
    type,
  }));
}

/**
 * Re-associate type information with the metric type (e.g., 'date', or 'numeric').
 *
 * When a job is being cloned the metrics returned from the server do not have
 * type information (e.g., numeric, date etc) associated with them.
 *
 * @param object { metrics: deserialized job metric object, typeMaps: { fields: string[], type: string } }
 * @returns { { : string, type: string, types: string[] }[] }
 */
export function retypeMetrics({ metrics, typeMaps }: any) {
  return metrics.map((metric: any) => {
    const { name: metricName } = metric;
    const { type } = typeMaps.find((t: any) =>
      t.fields.some((field: any) => field.name === metricName)
    );
    return {
      ...metric,
      type,
    };
  });
}

const stepIdToTitleMap = {
  [STEP_LOGISTICS]: i18n.translate('xpack.rollupJobs.create.steps.stepLogisticsTitle', {
    defaultMessage: 'Logistics',
  }),
  [STEP_DATE_HISTOGRAM]: i18n.translate('xpack.rollupJobs.create.steps.stepDateHistogramTitle', {
    defaultMessage: 'Date histogram',
  }),
  [STEP_TERMS]: i18n.translate('xpack.rollupJobs.create.steps.stepTermsTitle', {
    defaultMessage: 'Terms',
  }),
  [STEP_HISTOGRAM]: i18n.translate('xpack.rollupJobs.create.steps.stepHistogramTitle', {
    defaultMessage: 'Histogram',
  }),
  [STEP_METRICS]: i18n.translate('xpack.rollupJobs.create.steps.stepMetricsTitle', {
    defaultMessage: 'Metrics',
  }),
  [STEP_REVIEW]: i18n.translate('xpack.rollupJobs.create.steps.stepReviewTitle', {
    defaultMessage: 'Review and save',
  }),
};

export class RollupWizardUi extends Component<any, any> {
  static propTypes = {
    createJob: PropTypes.func,
    clearCloneJob: PropTypes.func,
    isSaving: PropTypes.bool,
    createJobError: PropTypes.node,
    jobToClone: PropTypes.object,
  };

  lastIndexPatternValidationTime: number;
  // @ts-ignore
  private _isMounted = false;

  constructor(props: any) {
    super(props);

    // props.kibana.services.setBreadcrumbs([listBreadcrumb, createBreadcrumb]);
    const { jobToClone: stepDefaultOverrides } = props;
    const stepsFields = mapValues(stepIdToStepConfigMap, (step) =>
      cloneDeep(step.getDefaultFields(stepDefaultOverrides))
    );

    this.state = {
      jobToClone: stepDefaultOverrides || null,
      checkpointStepId: stepIds[0],
      currentStepId: stepIds[0],
      nextStepId: stepIds[1],
      previousStepId: undefined,
      stepsFieldErrors: this.getStepsFieldsErrors(stepsFields),
      // Show step errors immediately if we are cloning a job.
      areStepErrorsVisible: !!stepDefaultOverrides,
      stepsFields,
      isValidatingIndexPattern: false,
      indexPatternAsyncErrors: undefined,
      indexPatternDateFields: [],
      indexPatternTermsFields: [],
      indexPatternHistogramFields: [],
      indexPatternMetricsFields: [],
      startJobAfterCreation: false,
    };

    this.lastIndexPatternValidationTime = 0;
  }

  componentDidMount() {
    this._isMounted = true;
    const { clearCloneJob, jobToClone } = this.props;
    if (jobToClone) {
      clearCloneJob();
    }
  }

  componentDidUpdate(prevProps: any, prevState: any) {
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
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    // Clean up after ourselves.
    this.props.clearCreateJobErrors();
  }

  getSteps() {
    const { currentStepId, checkpointStepId } = this.state;
    const indexOfCurrentStep = stepIds.indexOf(currentStepId);

    return stepIds.map((stepId: any, index: number) => ({
      title: stepIdToTitleMap[stepId],
      isComplete: index < indexOfCurrentStep,
      isSelected: index === indexOfCurrentStep,
      onClick: () => this.goToStep(stepId),
      disabled:
        !this.canGoToStep(stepId) || stepIds.indexOf(stepId) > stepIds.indexOf(checkpointStepId),
      'data-test-subj':
        index === indexOfCurrentStep
          ? `createRollupStep${index + 1}--active`
          : `createRollupStep${index + 1}`,
    }));
  }

  goToNextStep = () => {
    this.goToStep(this.state.nextStepId);
  };

  goToPreviousStep = () => {
    this.goToStep(this.state.previousStepId);
  };

  goToStep(stepId: any) {
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

  canGoToStep(stepId: any) {
    const indexOfStep = stepIds.indexOf(stepId);

    // Check every step before this one and see if it's been completed.
    const prerequisiteSteps = stepIds.slice(0, indexOfStep);

    return prerequisiteSteps.every(
      (prerequisiteStepId: any) => !this.hasStepErrors(prerequisiteStepId)
    );
  }

  hasStepErrors(stepId: any) {
    const { stepsFieldErrors } = this.state;

    const stepFieldErrors = stepsFieldErrors[stepId];
    return Object.values(stepFieldErrors).some((error) => error != null);
  }

  getStepsFieldsErrors(newStepsFields: any) {
    return Object.keys(newStepsFields).reduce((stepsFieldErrors: any, stepId) => {
      const stepFields = newStepsFields[stepId];
      const fieldsValidator = stepIdToStepConfigMap[stepId].fieldsValidator;
      stepsFieldErrors[stepId] =
        typeof fieldsValidator === `function` ? fieldsValidator(stepFields) : {};
      return stepsFieldErrors;
    }, {});
  }

  onFieldsChange = (fields: any, currentStepId = this.state.currentStepId) => {
    const { stepsFields } = this.state;
    const prevFields = stepsFields[currentStepId];

    const affectedStepsFields = getAffectedStepsFields(fields, stepsFields);

    const newFields = {
      ...prevFields,
      ...fields,
    };

    const newStepsFields = {
      ...affectedStepsFields,
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
          rollupDelay,
          rollupPageSize,
        },
        [STEP_DATE_HISTOGRAM]: { dateHistogramInterval, dateHistogramTimeZone, dateHistogramField },
        [STEP_TERMS]: { terms },
        [STEP_HISTOGRAM]: { histogram, histogramInterval },
        [STEP_METRICS]: { metrics },
        [STEP_REVIEW]: {},
      },
      startJobAfterCreation,
    } = this.state;

    return {
      id,
      indexPattern,
      rollupIndex,
      rollupCron,
      rollupPageSize,
      rollupDelay,
      dateHistogramInterval,
      dateHistogramTimeZone,
      dateHistogramField,
      terms,
      histogram,
      histogramInterval,
      metrics,
      startJobAfterCreation,
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

    let savingFeedback;

    if (isSaving) {
      savingFeedback = (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl" />
        </EuiOverlayMask>
      );
    }

    let saveErrorFeedback;

    if (saveError) {
      const { message, cause } = saveError;

      let errorBody;

      if (cause) {
        if (cause.length === 1) {
          errorBody = <p>{cause[0]}</p>;
        } else {
          errorBody = (
            <ul>
              {cause.map((causeValue: any) => (
                <li key={causeValue}>{causeValue}</li>
              ))}
            </ul>
          );
        }
      }

      saveErrorFeedback = (
        <Fragment>
          <EuiCallOut title={message} iconType="cross" color="danger">
            {errorBody}
          </EuiCallOut>

          <EuiSpacer />
        </Fragment>
      );
    }

    return (
      <EuiPage>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.rollupJobs.createTitle"
                  defaultMessage="Configure rollup action"
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
        {savingFeedback}
      </EuiPage>
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
            hasErrors={hasErrors(currentStepFieldErrors)}
            areStepErrorsVisible={areStepErrorsVisible}
            isValidatingIndexPattern={isValidatingIndexPattern}
            indexPatternAsyncErrors={indexPatternAsyncErrors}
            hasMatchingIndices={Boolean(indexPatternDateFields.length)}
          />
        );

      case STEP_DATE_HISTOGRAM:
        return (
          <StepDateHistogram
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            hasErrors={hasErrors(currentStepFieldErrors)}
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
            hasErrors={hasErrors(currentStepFieldErrors)}
            areStepErrorsVisible={areStepErrorsVisible}
            histogramFields={indexPatternHistogramFields}
          />
        );

      case STEP_METRICS:
        return (
          <StepMetrics
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            areStepErrorsVisible={areStepErrorsVisible}
            metricsFields={indexPatternMetricsFields}
          />
        );

      case STEP_REVIEW:
        return <StepReview job={this.getAllFields()} />;

      default:
        return null;
    }
  }

  onToggleStartAfterCreate = (eve: any) => {
    this.setState({ startJobAfterCreation: eve.target.checked });
  };

  renderNavigation() {
    const {
      isValidatingIndexPattern,
      nextStepId,
      previousStepId,
      areStepErrorsVisible,
      startJobAfterCreation,
    } = this.state;

    const { isSaving } = this.props;
    const hasNextStep = nextStepId != null;

    // Users can click the next step button as long as validation hasn't executed, and as long
    // as we're not waiting on async validation to complete.
    const canGoToNextStep =
      !isValidatingIndexPattern &&
      hasNextStep &&
      (!areStepErrorsVisible || this.canGoToStep(nextStepId));

    return (
      <Navigation
        isSaving={isSaving}
        hasNextStep={hasNextStep}
        hasPreviousStep={previousStepId != null}
        goToNextStep={this.goToNextStep}
        goToPreviousStep={this.goToPreviousStep}
        canGoToNextStep={canGoToNextStep}
        save={this.save}
        onClickToggleStart={this.onToggleStartAfterCreate}
        startJobAfterCreation={startJobAfterCreation}
      />
    );
  }
}

export const RollupWizard = withKibana(RollupWizardUi);
