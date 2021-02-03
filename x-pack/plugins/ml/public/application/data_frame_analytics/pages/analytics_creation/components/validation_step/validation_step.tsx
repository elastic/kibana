/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ml } from '../../../../../services/ml_api_service';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { getJobConfigFromFormState } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { VALIDATION_STATUS } from '../../../../../../../common/constants/validation';
import { DataFrameAnalyticsConfig } from '../../../../../../../common/types/data_frame_analytics';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';

interface CalloutMessage {
  id?: string;
  heading?: string;
  status?: VALIDATION_STATUS;
  text: string;
  url?: string;
}

const statusToEuiColor = (status: VALIDATION_STATUS) => {
  switch (status) {
    case VALIDATION_STATUS.INFO:
      return 'primary';
      break;
    case VALIDATION_STATUS.ERROR:
      return 'danger';
      break;
    default:
      return status;
  }
};

const statusToEuiIconType = (status: VALIDATION_STATUS) => {
  switch (status) {
    case VALIDATION_STATUS.INFO:
      return 'iInCircle';
      break;
    case VALIDATION_STATUS.ERROR:
      return 'cross';
      break;
    case VALIDATION_STATUS.SUCCESS:
      return 'check';
      break;
    case VALIDATION_STATUS.WARNING:
      return 'alert';
      break;
    default:
      return status;
  }
};

const defaultIconType = 'questionInCircle';

const Link: FC<{ url: string }> = ({ url }) => (
  <EuiLink href={url} target="_BLANK">
    <FormattedMessage id="xpack.ml.validateJob.learnMoreLinkText" defaultMessage="Learn more" />
  </EuiLink>
);

const Message: FC<CalloutMessage> = ({ text, url }) => (
  <>
    {text} {url && <Link url={url} />}
  </>
);
// TODO: if possible, move this to a shared component so it can be shared here and in validate_job_view (AD)
const Callout: FC<CalloutMessage> = ({ heading, status, text, url }) => (
  <>
    <EuiCallOut
      // @ts-ignore
      color={statusToEuiColor(status)}
      size="s"
      title={heading || <Message text={text} url={url} />}
      iconType={status ? statusToEuiIconType(status) : defaultIconType}
    >
      {heading && <Message text={text} url={url} />}
    </EuiCallOut>
    <EuiSpacer size="m" />
  </>
);

interface Props extends CreateAnalyticsStepProps {
  setValidationSummary: any;
}

export const ValidationStep: FC<Props> = ({ state, setCurrentStep, setValidationSummary }) => {
  const [checksInProgress, setChecksInProgress] = useState<boolean>(false);
  const [validationMessages, setValidationMessages] = useState<CalloutMessage[]>([]);

  const { form, jobConfig, isAdvancedEditorEnabled } = state;

  const runValidationChecks = async () => {
    try {
      const analyticsJobConfig = (isAdvancedEditorEnabled
        ? jobConfig
        : getJobConfigFromFormState(form)) as DataFrameAnalyticsConfig;
      const validationResults = await ml.dataFrameAnalytics.validateDataFrameAnalytics(
        analyticsJobConfig
      );

      const validationSummary = { warning: 0, success: 0 };
      validationResults.forEach((message: any) => {
        if (message?.status === VALIDATION_STATUS.WARNING) {
          validationSummary.warning++;
        } else if (message?.status === VALIDATION_STATUS.SUCCESS) {
          validationSummary.success++;
        }
      });

      setValidationMessages(validationResults);
      setValidationSummary(validationSummary);
      setChecksInProgress(false);
    } catch (e) {
      // TODO: toast or error message?
      setChecksInProgress(false);
    }
  };

  useEffect(function beginValidationChecks() {
    setChecksInProgress(true);
    runValidationChecks();
  }, []);

  const callouts = validationMessages.map((m, i) => <Callout key={`${m.id}_${i}`} {...m} />);

  return (
    <>
      {checksInProgress && <EuiLoadingSpinner size="xl" />}
      {!checksInProgress && (
        <>
          {callouts}
          <EuiSpacer />
          <ContinueButton
            onClick={() => {
              setCurrentStep(ANALYTICS_STEPS.CREATE);
            }}
          />
        </>
      )}
    </>
  );
};
