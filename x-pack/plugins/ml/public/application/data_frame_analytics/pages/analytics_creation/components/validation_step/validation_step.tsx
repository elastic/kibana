/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useMlContext } from '../../../../../contexts/ml';
import { ml } from '../../../../../services/ml_api_service';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { VALIDATION_STATUS } from '../../../../../../../common/constants/validation';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
import {
  CalloutMessage,
  INCLUDED_FIELDS_THRESHOLD,
  TRAINING_DOCS_UPPER,
  TRAINING_DOCS_LOWER,
} from './validations';

const statusToEuiColor = (status: string) => {
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

const statusToEuiIconType = (status: string) => {
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

  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext; // currentSavedSearch,

  const { form } = state;
  const { trainingPercent } = form;

  const numberOfFieldsCheck = () => {
    let message;
    if (form.includes.length > INCLUDED_FIELDS_THRESHOLD) {
      message = {
        id: 'included-fields',
        text: 'High number of analysis fields may result in long-running jobs.',
        status: VALIDATION_STATUS.WARNING,
        heading: 'Analysis fields',
      };
    } else {
      message = {
        id: 'included-fields',
        text: 'Analysis fields validation successful.',
        status: VALIDATION_STATUS.SUCCESS,
        heading: 'Analysis fields',
      };
    }
    return message;
  };

  const trainingPercentCheck = async () => {
    let message;
    const esSearchRequest = {
      size: 0,
      track_total_hits: true,
      index: currentIndexPattern.title,
    };
    try {
      const resp = await ml.esSearch(esSearchRequest);
      const totalDocs = resp.hits.total.value;
      const trainingDocs = totalDocs * (trainingPercent / 100);

      if (trainingDocs >= TRAINING_DOCS_UPPER) {
        message = {
          id: 'training-percent-high',
          text:
            'High number of training docs may result in long-running jobs. Try reducing the tranining percent.',
          status: VALIDATION_STATUS.WARNING,
          heading: 'Training percent',
        };
      } else if (trainingDocs <= TRAINING_DOCS_LOWER) {
        message = {
          id: 'training-percent-low',
          text:
            'Low number of training docs may result in inaccurate models. Try increasing the tranining percent or using a larger dataset.',
          status: VALIDATION_STATUS.WARNING,
          heading: 'Training percent',
        };
      } else {
        message = {
          id: 'training-percent',
          text: 'Training percent validation successful.',
          status: VALIDATION_STATUS.SUCCESS,
          heading: 'Training percent',
        };
      }
      setChecksInProgress(false);
      return message;
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  };

  const runValidationChecks = async () => {
    const validationResults = await Promise.all([trainingPercentCheck()]);
    const numFieldsMessage = numberOfFieldsCheck();

    if (numFieldsMessage !== undefined) {
      validationResults.push(numFieldsMessage);
    }

    const validationSummary = { warning: 0, success: 0 };
    validationResults.forEach((message) => {
      if (message?.status === VALIDATION_STATUS.WARNING) {
        validationSummary.warning++;
      } else if (message?.status === VALIDATION_STATUS.SUCCESS) {
        validationSummary.success++;
      }
    });

    if (validationResults && validationResults.length) {
      // @ts-ignore
      setValidationMessages(validationResults);
      setValidationSummary(validationSummary);
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
