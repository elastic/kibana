/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { VALIDATION_STATUS } from '../../../../common/constants/validation';

export const defaultIconType = 'questionInCircle';

export interface CalloutMessage {
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

export const statusToEuiIconType = (status: VALIDATION_STATUS) => {
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

export const Callout: FC<CalloutMessage> = ({ heading, status, text, url }) => (
  <>
    <EuiCallOut
      data-test-subj={'mlValidationCallout'}
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
