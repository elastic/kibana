/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, debounce, first, mapValues } from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { withKibana } from '../../../../../../../src/plugins/kibana_react/public';

import {
  EuiCallOut,
  EuiLoadingLogo,
  EuiOverlayMask,
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
  EuiStepsHorizontal,
} from '@elastic/eui';

import {
  validateIndexPattern,
  formatFields,
  listBreadcrumb,
  createBreadcrumb,
  retypeMetrics,
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
  getAffectedStepsFields,
  hasErrors,
} from './steps_config';

import { getFatalErrors } from '../../../kibana_services';

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

export class JobCreateUi extends Component {
  static propTypes = {
    createJob: PropTypes.func,
    clearCloneJob: PropTypes.func,
    isSaving: PropTypes.bool,
    createJobError: PropTypes.node,
    jobToClone: PropTypes.object,
  };

  constructor(props) {
    super(props);

    props.kibana.services.setBreadcrumbs([listBreadcrumb, createBreadcrumb]);
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

    this.lastIndexPatternValidationIdx = 0;
  }

  componentDidMount() {
    this._isMounted = true;
    const { clearCloneJob, jobToClone } = this.props;
    if (jobToClone) {
      clearCloneJob();
      this.requestIndexPatternValidation(false);
    }
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
    this._isMounted = false;
    // Clean up after ourselves.
    this.props.clearCreateJobErrors();
  }

  requestIndexPatternValidation = debounce((resetDefaults = true) => {
    const indexPattern = this.getIndexPattern();

    const lastIndexPatternValidationIdx = ++this.lastIndexPatternValidationIdx;
    validateIndexPattern(indexPattern)
      .then((response) => {
        // We don't need to do anything if this component has been unmounted.
        if (!this._isMounted) {
          return;
        }

        // Only re-request if the index pattern changed.
        if (lastIndexPatternValidationIdx !== this.lastIndexPatternValidationIdx) {
          return;
        }

        const {
          doesMatchIndices: doesIndexPatternMatchIndices,
          doesMatchRollupIndices: doesIndexPatternMatchRollupIndices,
          dateFields: indexPatternDateFields,
          numericFields,
          keywordFields,
        } = response;

        let indexPatternAsyncErrors;

        if (doesIndexPatternMatchRollupIndices) {
          indexPatternAsyncErrors = [
            <FormattedMessage
              id="xpack.rollupJobs.create.errors.indexPatternMatchesRollupIndices"
              defaultMessage="Index pattern must not match rollup indices."
            />,
          ];
        } else if (!doesIndexPatternMatchIndices) {
          indexPatternAsyncErrors = [
            <FormattedMessage
              id="xpack.rollupJobs.create.errors.indexPatternNoMatchingIndices"
              defaultMessage="Index pattern doesn't match any indices."
            />,
          ];
        } else if (!indexPatternDateFields.length) {
          indexPatternAsyncErrors = [
            <FormattedMessage
              id="xpack.rollupJobs.create.errors.indexPatternNoTimeFields"
              defaultMessage="Index pattern must match indices that contain time fields."
            />,
          ];
        }

        const numericType = i18n.translate('xpack.rollupJobs.create.numericTypeField', {
          defaultMessage: 'numeric',
        });
        const keywordType = i18n.translate('xpack.rollupJobs.create.keywordTypeField', {
          defaultMessage: 'keyword',
        });
        const dateType = i18n.translate('xpack.rollupJobs.create.dateTypeField', {
          defaultMessage: 'date',
        });

        const formattedNumericFields = formatFields(numericFields, numericType);
        const formattedKeywordFields = formatFields(keywordFields, keywordType);
        const formattedDateFields = formatFields(indexPatternDateFields, dateType);

        const { jobToClone, stepsFields } = this.state;
        const {
          [STEP_METRICS]: { metrics },
        } = stepsFields;

        // Only re-type metrics if they haven't been typed already
        if (jobToClone && metrics && metrics.length && !first(metrics).type) {
          // Re-type any pre-existing metrics entries for the job we are cloning.
          const typeMaps = [
            { fields: formattedNumericFields, type: numericType },
            { fields: formattedKeywordFields, type: keywordType },
            { fields: formattedDateFields, type: dateType },
          ];
          const retypedMetrics = retypeMetrics({ metrics, typeMaps });
          this.onFieldsChange({ metrics: retypedMetrics }, STEP_METRICS);
        }

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

        const indexPatternTermsFields = [...formattedNumericFields, ...formattedKeywordFields].sort(
          sortFields
        );

        const indexPatternHistogramFields = [...formattedNumericFields].sort(sortFields);

        const indexPatternMetricsFields = [...formattedNumericFields, ...formattedDateFields].sort(
          sortFields
        );

        indexPatternDateFields.sort();

        if (resetDefaults) {
          // Whenever the index pattern changes we default to the first date field if there is one.
          this.onFieldsChange(
            {
              dateHistogramField: indexPatternDateFields.length
                ? indexPatternDateFields[0]
                : undefined,
            },
            STEP_DATE_HISTOGRAM
          );
        }

        this.setState({
          indexPatternAsyncErrors,
          indexPatternDateFields,
          indexPatternTermsFields,
          indexPatternHistogramFields,
          indexPatternMetricsFields,
          isValidatingIndexPattern: false,
        });
      })
      .catch((error) => {
        // We don't need to do anything if this component has been unmounted.
        if (!this._isMounted) {
          return;
        }

        // Ignore all responses except that to the most recent request.
        if (lastIndexPatternValidationIdx !== this.lastIndexPatternValidationIdx) {
          return;
        }

        // Expect an error in the shape provided by http service.
        if (error && error.body) {
          const { error: errorString, statusCode } = error.body;

          const indexPatternAsyncErrors = [
            <FormattedMessage
              id="xpack.rollupJobs.create.errors.indexPatternValidationError"
              defaultMessage="There was a problem validating this index pattern: {statusCode} {error}"
              values={{ error: errorString, statusCode }}
            />,
          ];

          this.setState({
            indexPatternAsyncErrors,
            indexPatternDateFields: [],
            indexPatternTermsFields: [],
            indexPatternHistogramFields: [],
            indexPatternMetricsFields: [],
            isValidatingIndexPattern: false,
          });

          return;
        }

        // This error isn't an HTTP error, so let the fatal error screen tell the user something
        // unexpected happened.
        getFatalErrors().add(
          error,
          i18n.translate('xpack.rollupJobs.create.errors.indexPatternValidationFatalErrorTitle', {
            defaultMessage: 'Rollup Job Wizard index pattern validation',
          })
        );
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

    return prerequisiteSteps.every((prerequisiteStepId) => !this.hasStepErrors(prerequisiteStepId));
  }

  hasStepErrors(stepId) {
    const { indexPatternAsyncErrors, stepsFieldErrors } = this.state;

    if (stepId === STEP_LOGISTICS) {
      if (Boolean(indexPatternAsyncErrors)) {
        return true;
      }
    }

    const stepFieldErrors = stepsFieldErrors[stepId];
    return Object.values(stepFieldErrors).some((error) => error != null);
  }

  getStepsFieldsErrors(newStepsFields) {
    return Object.keys(newStepsFields).reduce((stepsFieldErrors, stepId) => {
      const stepFields = newStepsFields[stepId];
      const fieldsValidator = stepIdToStepConfigMap[stepId].fieldsValidator;
      stepsFieldErrors[stepId] =
        typeof fieldsValidator === `function` ? fieldsValidator(stepFields) : {};
      return stepsFieldErrors;
    }, {});
  }

  onFieldsChange = (fields, currentStepId = this.state.currentStepId) => {
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
          <EuiLoadingLogo logo="logoKibana" size="xl" />
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
              {cause.map((causeValue) => (
                <li key={causeValue}>{causeValue}</li>
              ))}
            </ul>
          );
        }
      }

      saveErrorFeedback = (
        <>
          <EuiSpacer />

          <EuiCallOut title={message} icon="cross" color="danger">
            {errorBody}
          </EuiCallOut>

          <EuiSpacer />
        </>
      );
    }

    return (
      <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
        <EuiPageHeader
          bottomBorder
          pageTitle={
            <FormattedMessage
              id="xpack.rollupJobs.createTitle"
              defaultMessage="Create rollup job"
            />
          }
        />

        <EuiSpacer size="l" />

        <EuiStepsHorizontal steps={this.getSteps()} />

        {saveErrorFeedback}

        <EuiSpacer />

        {this.renderCurrentStep()}

        <EuiSpacer size="l" />

        {this.renderNavigation()}

        {savingFeedback}
      </EuiPageContentBody>
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
            indexPattern={this.getIndexPattern()}
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

  onToggleStartAfterCreate = (eve) => {
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

export const JobCreate = withKibana(JobCreateUi);
