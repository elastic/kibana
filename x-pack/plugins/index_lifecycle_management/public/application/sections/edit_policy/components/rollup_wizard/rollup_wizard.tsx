/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import {
  EuiButtonEmpty,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiHorizontalRule,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { cloneDeep, mapValues } from 'lodash';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { RollupAction } from '../../../../../../common/types';

import { serializeRollup, deserializeRollup } from './serialize_and_deserialize_rollup';
import { InternalRollup } from './types';

// @ts-ignore
import { Navigation } from './navigation';

import {
  StepDateHistogram,
  StepTerms,
  StepHistogram,
  StepMetrics,
  StepReview,
  // @ts-ignore
} from './steps';

import {
  STEP_DATE_HISTOGRAM,
  STEP_TERMS,
  STEP_HISTOGRAM,
  STEP_METRICS,
  STEP_REVIEW,
  stepIds,
  stepIdToStepConfigMap,
  hasErrors,
  // @ts-ignore
} from './steps_config';

// TODO: fix anys in this file!

const stepIdToTitleMap = {
  [STEP_DATE_HISTOGRAM]: i18n.translate(
    'xpack.indexLifecycleMgmt.rollupJob.create.steps.stepDateHistogramTitle',
    {
      defaultMessage: 'Date histogram',
    }
  ),
  [STEP_TERMS]: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.steps.stepTermsTitle', {
    defaultMessage: 'Terms',
  }),
  [STEP_HISTOGRAM]: i18n.translate(
    'xpack.indexLifecycleMgmt.rollup.create.steps.stepHistogramTitle',
    {
      defaultMessage: 'Histogram',
    }
  ),
  [STEP_METRICS]: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.steps.stepMetricsTitle', {
    defaultMessage: 'Metrics',
  }),
  [STEP_REVIEW]: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.steps.stepReviewTitle', {
    defaultMessage: 'Review',
  }),
};

const i18nTexts = {
  title: {
    hot: i18n.translate('xpack.indexLifecycleMgmt.rollup.hot.phaseTitle', {
      defaultMessage: 'hot',
    }),
    cold: i18n.translate('xpack.indexLifecycleMgmt.rollup.cold.phaseTitle', {
      defaultMessage: 'cold',
    }),
  },
};

export interface Props {
  /**
   * The rollup action to configure, otherwise default to empty rollup action.
   */
  value?: RollupAction['config'];
  phase: 'hot' | 'cold';
  onCancel: () => void;
  onDone: (value: RollupAction['config']) => void;
}

export interface StepFields {
  STEP_DATE_HISTOGRAM: {
    dateHistogramIntervalType: InternalRollup['dateHistogramIntervalType'];
    dateHistogramInterval: string;
    dateHistogramTimeZone: string;
    dateHistogramField: string;
  };
  STEP_TERMS: { terms: Array<{ name: string }> };
  STEP_HISTOGRAM: { histogram: Array<{ name: string }>; histogramInterval: string };
  STEP_METRICS: { metrics: Array<{ name: string; types: string[] }> };
  STEP_REVIEW: {};
}

interface State {
  checkpointStepId: string;
  isNewRollup: boolean;
  currentStepId: keyof StepFields;
  nextStepId: keyof StepFields;
  previousStepId?: keyof StepFields;
  stepsFieldErrors: Record<string, Record<string, string | undefined>>;
  areStepErrorsVisible: boolean;
  stepsFields: StepFields;
}

const deriveStepFields = (value: RollupAction['config'] | undefined): StepFields => {
  const deserializedRollup = value ? deserializeRollup(value) : {};

  return mapValues(stepIdToStepConfigMap, (step) =>
    cloneDeep(step.getDefaultFields(deserializedRollup))
  );
};

export class RollupWizard extends Component<Props, State> {
  lastIndexPatternValidationTime: number;
  // @ts-ignore
  private _isMounted = false;

  constructor(props: Props) {
    super(props);

    const { value } = props;
    const stepsFields = deriveStepFields(value);
    const stepsFieldErrors = this.getStepsFieldsErrors(stepsFields);
    this.state = {
      isNewRollup: !value,
      checkpointStepId: this.calculateLastPossibleStepCheckPoint(stepsFieldErrors),
      currentStepId: stepIds[0],
      nextStepId: stepIds[1],
      previousStepId: undefined,
      stepsFieldErrors,
      areStepErrorsVisible: false,
      stepsFields,
    };

    this.lastIndexPatternValidationTime = 0;
  }

  calculateLastPossibleStepCheckPoint(stepsFieldErrors = this.state.stepsFieldErrors) {
    for (const stepId of stepIds) {
      for (const value of Object.values(stepsFieldErrors[stepId])) {
        if (value) {
          return stepId;
        }
      }
    }
    return stepIds[stepIds.length - 1];
  }

  componentDidMount() {
    window.scroll({ top: 0 });
    this._isMounted = true;
  }

  componentDidUpdate(prev: Props) {
    if (prev.value !== this.props.value) {
      const stepsFields = deriveStepFields(this.props.value);
      this.setState({
        isNewRollup: !this.props.value,
        stepsFields,
        stepsFieldErrors: this.getStepsFieldsErrors(stepsFields),
      });
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
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
        typeof fieldsValidator === `function` ? fieldsValidator(stepFields, newStepsFields) : {};
      return stepsFieldErrors;
    }, {});
  }

  onFieldsChange = (fields: any, currentStepId = this.state.currentStepId) => {
    const { stepsFields } = this.state;
    const prevFields = stepsFields[currentStepId];

    const newFields = {
      ...prevFields,
      ...fields,
    };

    const newStepsFields = {
      ...stepsFields,
      [currentStepId]: newFields,
    };

    this.setState({
      stepsFields: newStepsFields,
      stepsFieldErrors: this.getStepsFieldsErrors(newStepsFields),
    });
  };

  getAllFields(): InternalRollup {
    const {
      stepsFields: {
        STEP_DATE_HISTOGRAM: {
          dateHistogramInterval,
          dateHistogramTimeZone,
          dateHistogramField,
          dateHistogramIntervalType,
        },
        STEP_TERMS: { terms },
        STEP_HISTOGRAM: { histogram, histogramInterval },
        STEP_METRICS: { metrics },
        STEP_REVIEW: {},
      },
    } = this.state;

    return {
      dateHistogramIntervalType,
      dateHistogramInterval,
      dateHistogramTimeZone,
      dateHistogramField,
      terms,
      histogram,
      histogramInterval,
      metrics,
    };
  }

  save = () => {
    const rollupConfig = this.getAllFields();
    this.props.onDone(serializeRollup(rollupConfig));
  };

  render() {
    const { phase, onCancel } = this.props;
    return (
      <>
        <EuiButtonEmpty flush="left" onClick={onCancel} iconType="arrowLeft" iconSide="left">
          {i18n.translate('xpack.indexLifecycleMgmt.rollup.backToPolicyButtonLabel', {
            defaultMessage: 'Back to policy',
          })}
        </EuiButtonEmpty>
        <EuiHorizontalRule />
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.rollup.createTitle"
                defaultMessage="Configure {phase} phase rollup action"
                values={{
                  phase: i18nTexts.title[phase],
                }}
              />
            </h1>
          </EuiTitle>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiStepsHorizontal steps={this.getSteps()} />

        <EuiSpacer />

        {this.renderCurrentStep()}

        <EuiHorizontalRule />

        {this.renderNavigation()}
      </>
    );
  }

  renderCurrentStep() {
    const { phase } = this.props;
    const { currentStepId, stepsFields, stepsFieldErrors, areStepErrorsVisible } = this.state;

    const currentStepFields = stepsFields[currentStepId];
    const currentStepFieldErrors = stepsFieldErrors[currentStepId];

    switch (currentStepId) {
      case STEP_DATE_HISTOGRAM:
        return (
          <StepDateHistogram
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            hasErrors={hasErrors(currentStepFieldErrors)}
            areStepErrorsVisible={areStepErrorsVisible}
          />
        );

      case STEP_TERMS:
        return <StepTerms fields={currentStepFields} onFieldsChange={this.onFieldsChange} />;

      case STEP_HISTOGRAM:
        return (
          <StepHistogram
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            hasErrors={hasErrors(currentStepFieldErrors)}
            areStepErrorsVisible={areStepErrorsVisible}
          />
        );

      case STEP_METRICS:
        return (
          <StepMetrics
            dateHistogramField={stepsFields.STEP_DATE_HISTOGRAM.dateHistogramField}
            fields={currentStepFields}
            onFieldsChange={this.onFieldsChange}
            fieldErrors={currentStepFieldErrors}
            areStepErrorsVisible={areStepErrorsVisible}
          />
        );
      case STEP_REVIEW:
        return <StepReview phase={phase} rollupAction={this.getAllFields()} />;
      default:
        return null;
    }
  }

  renderNavigation() {
    const { nextStepId, previousStepId, areStepErrorsVisible, isNewRollup } = this.state;

    const hasNextStep = nextStepId != null;

    // Users can click the next step button as long as validation hasn't executed
    const canGoToNextStep = hasNextStep && (!areStepErrorsVisible || this.canGoToStep(nextStepId));

    return (
      <Navigation
        isNewRollup={isNewRollup}
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
