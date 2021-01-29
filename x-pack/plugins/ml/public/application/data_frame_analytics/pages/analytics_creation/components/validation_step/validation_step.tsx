/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiCallOut, EuiLink, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

// import { useMlKibana } from '../../../../../contexts/kibana';
import { CreateAnalyticsStepProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { VALIDATION_STATUS } from '../../../../../../../common/constants/validation';
import { ANALYTICS_STEPS } from '../../page';
import { ContinueButton } from '../continue_button';
interface CalloutMessage {
  id?: string;
  url?: string;
  text: string;
  status?: string;
  heading?: string;
}

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

export const ValidationStep: FC<CreateAnalyticsStepProps> = ({
  actions,
  state,
  setCurrentStep,
}) => {
  const [checksInProgress, setChecksInProgress] = useState<boolean>(false);
  // @ts-ignore
  const [validationMessages, setValidationMessages] = useState<CalloutMessage[]>([]);

  useEffect(function beginValidationChecks() {
    setChecksInProgress(true);
  }, []);
  const isStepInvalid = false;

  const callouts = validationMessages.map((m, i) => <Callout key={`${m.id}_${i}`} {...m} />);

  return (
    <>
      {checksInProgress && <EuiLoadingSpinner size="xl" />}
      {!checksInProgress && (
        <>
          {callouts}
          <EuiSpacer />
          <ContinueButton
            isDisabled={isStepInvalid}
            onClick={() => {
              setCurrentStep(ANALYTICS_STEPS.CREATE);
            }}
          />
        </>
      )}
    </>
  );
};
