/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useMlApiContext } from '../../../../../contexts/kibana';
import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { getJobConfigFromFormState } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { VALIDATION_STATUS } from '../../../../../../../common/constants/validation';
import { DataFrameAnalyticsConfig } from '../../../../../../../common/types/data_frame_analytics';
import { Callout, CalloutMessage } from '../../../../../components/callout';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import { ValidationSummary } from './validation_step_wrapper';

interface Props extends CreateAnalyticsStepProps {
  setValidationSummary: React.Dispatch<React.SetStateAction<ValidationSummary>>;
}

export const ValidationStep: FC<Props> = ({ state, setCurrentStep, setValidationSummary }) => {
  const [checksInProgress, setChecksInProgress] = useState<boolean>(false);
  const [validationMessages, setValidationMessages] = useState<CalloutMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<CalloutMessage | undefined>();

  const { form, jobConfig, isAdvancedEditorEnabled } = state;
  const {
    dataFrameAnalytics: { validateDataFrameAnalytics },
  } = useMlApiContext();

  const runValidationChecks = async () => {
    try {
      const analyticsJobConfig = (isAdvancedEditorEnabled
        ? jobConfig
        : getJobConfigFromFormState(form)) as DataFrameAnalyticsConfig;
      const validationResults: CalloutMessage[] = await validateDataFrameAnalytics(
        analyticsJobConfig
      );

      const validationSummary = { warning: 0, success: 0 };
      validationResults.forEach((message) => {
        if (message?.status === VALIDATION_STATUS.WARNING) {
          validationSummary.warning++;
        } else if (message?.status === VALIDATION_STATUS.SUCCESS) {
          validationSummary.success++;
        }
      });

      setValidationMessages(validationResults);
      setValidationSummary(validationSummary);
      setChecksInProgress(false);
    } catch (err) {
      setErrorMessage({
        heading: i18n.translate(
          'xpack.ml.dataframe.analytics.validation.validationFetchErrorMessage',
          {
            defaultMessage: 'Error validating job',
          }
        ),
        id: 'error',
        status: VALIDATION_STATUS.ERROR,
        text: extractErrorMessage(err),
      });
      setChecksInProgress(false);
    }
  };

  useEffect(function beginValidationChecks() {
    setChecksInProgress(true);
    runValidationChecks();
  }, []);

  if (errorMessage !== undefined) {
    validationMessages.push(errorMessage);
  }

  const callouts = validationMessages.map((m, i) => <Callout key={`${m.id}_${i}`} {...m} />);

  return (
    <>
      {checksInProgress && <EuiLoadingSpinner size="xl" />}
      {!checksInProgress && (
        <>
          {callouts}
          <EuiSpacer />
          <ContinueButton
            isDisabled={false}
            onClick={() => {
              setCurrentStep(ANALYTICS_STEPS.CREATE);
            }}
          />
        </>
      )}
    </>
  );
};
