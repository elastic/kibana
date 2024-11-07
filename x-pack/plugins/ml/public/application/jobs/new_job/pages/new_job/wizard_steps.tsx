/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { Fragment, useState, useMemo, useEffect, useContext } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiSpacer, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import { FieldStatsFlyoutProvider } from '@kbn/ml-field-stats-flyout';
import { JobCreatorContext } from '../components/job_creator_context';
import { useMlKibana } from '../../../../contexts/kibana';
import { WIZARD_STEPS } from '../components/step_types';

import { TimeRangeStep } from '../components/time_range_step';

import { PickFieldsStep } from '../components/pick_fields_step';
import { JobDetailsStep } from '../components/job_details_step';
import { ValidationStep } from '../components/validation_step';
import { SummaryStep } from '../components/summary_step';
import { DatafeedStep } from '../components/datafeed_step';
import { useDataSource } from '../../../../contexts/ml';

interface Props {
  currentStep: WIZARD_STEPS;
  setCurrentStep: React.Dispatch<React.SetStateAction<WIZARD_STEPS>>;
}

export const WizardSteps: FC<Props> = ({ currentStep, setCurrentStep }) => {
  const dataSourceContext = useDataSource();
  const { services } = useMlKibana();
  const fieldStatsServices: FieldStatsServices = useMemo(() => {
    const { uiSettings, data, fieldFormats, charts } = services;
    return {
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    };
  }, [services]);

  const { jobCreator, jobCreatorUpdated } = useContext(JobCreatorContext);

  const [start, setStart] = useState(jobCreator?.start);
  const [end, setEnd] = useState(jobCreator?.end);

  useEffect(() => {
    if ((jobCreator && jobCreator.start !== start) || jobCreator.end !== end) {
      setStart(jobCreator.start);
      setEnd(jobCreator.end);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  // Format timestamp to ISO formatted date strings
  const timeRangeMs = useMemo(() => {
    // If time range is available via jobCreator, use that
    // else mimic Discover and set timeRange to be now for data view without time field
    return start && end ? { from: start, to: end } : undefined;
  }, [start, end]);

  // store whether the advanced and additional sections have been expanded.
  // has to be stored at this level to ensure it's remembered on wizard step change
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [additionalExpanded, setAdditionalExpanded] = useState(false);
  function getSummaryStepTitle() {
    if (dataSourceContext.selectedSavedSearch) {
      return i18n.translate('xpack.ml.newJob.wizard.stepComponentWrapper.summaryTitleSavedSearch', {
        defaultMessage: 'New job from saved search {title}',
        values: { title: dataSourceContext.selectedSavedSearch.title ?? '' },
      });
    } else if (dataSourceContext.selectedDataView.id !== undefined) {
      return i18n.translate('xpack.ml.newJob.wizard.stepComponentWrapper.summaryTitleDataView', {
        defaultMessage: 'New job from data view {dataViewName}',
        values: { dataViewName: dataSourceContext.selectedDataView.getName() },
      });
    }
    return '';
  }

  return (
    <Fragment>
      {currentStep === WIZARD_STEPS.TIME_RANGE && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleTimeRange">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.timeRangeTitle"
              defaultMessage="Time range"
            />
          </Title>
          <TimeRangeStep
            isCurrentStep={currentStep === WIZARD_STEPS.TIME_RANGE}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleConfigureDatafeed">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.configureDatafeedTitle"
              defaultMessage="Configure datafeed"
            />
          </Title>
          <DatafeedStep
            isCurrentStep={currentStep === WIZARD_STEPS.ADVANCED_CONFIGURE_DATAFEED}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.PICK_FIELDS && (
        <Fragment>
          <FieldStatsFlyoutProvider
            dataView={dataSourceContext.selectedDataView}
            fieldStatsServices={fieldStatsServices}
            timeRangeMs={timeRangeMs}
            dslQuery={jobCreator.query}
            theme={services.theme}
          >
            <>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <Title data-test-subj="mlJobWizardStepTitlePickFields">
                    <FormattedMessage
                      id="xpack.ml.newJob.wizard.stepComponentWrapper.pickFieldsTitle"
                      defaultMessage="Choose fields"
                    />
                  </Title>
                </EuiFlexItem>
              </EuiFlexGroup>
              <PickFieldsStep
                isCurrentStep={currentStep === WIZARD_STEPS.PICK_FIELDS}
                setCurrentStep={setCurrentStep}
              />
            </>
          </FieldStatsFlyoutProvider>
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.JOB_DETAILS && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleJobDetails">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.jobDetailsTitle"
              defaultMessage="Job details"
            />
          </Title>
          <JobDetailsStep
            isCurrentStep={currentStep === WIZARD_STEPS.JOB_DETAILS}
            setCurrentStep={setCurrentStep}
            advancedExpanded={advancedExpanded}
            setAdvancedExpanded={setAdvancedExpanded}
            additionalExpanded={additionalExpanded}
            setAdditionalExpanded={setAdditionalExpanded}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.VALIDATION && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleValidation">
            <FormattedMessage
              id="xpack.ml.newJob.wizard.stepComponentWrapper.validationTitle"
              defaultMessage="Validation"
            />
          </Title>
          <ValidationStep
            isCurrentStep={currentStep === WIZARD_STEPS.VALIDATION}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
      {currentStep === WIZARD_STEPS.SUMMARY && (
        <Fragment>
          <Title data-test-subj="mlJobWizardStepTitleSummary">{getSummaryStepTitle()}</Title>
          <SummaryStep
            isCurrentStep={currentStep === WIZARD_STEPS.SUMMARY}
            setCurrentStep={setCurrentStep}
          />
        </Fragment>
      )}
    </Fragment>
  );
};

const Title: FC<PropsWithChildren<{ 'data-test-subj': string }>> = ({
  'data-test-subj': dataTestSubj,
  children,
}) => {
  return (
    <Fragment>
      <EuiTitle size="s">
        <h2 data-test-subj={dataTestSubj}>{children}</h2>
      </EuiTitle>
      <EuiSpacer />
    </Fragment>
  );
};
