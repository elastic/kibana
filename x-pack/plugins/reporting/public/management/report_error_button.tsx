/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiButtonIcon, EuiCallOut, EuiPopover } from '@elastic/eui';
import { InjectedIntl } from '@kbn/i18n/react';
import React, { useState } from 'react';
import { Job as ListingJob } from '../lib/job';
import { ReportingAPIClient } from '../lib/reporting_api_client';

interface Props {
  intl: InjectedIntl;
  apiClient: ReportingAPIClient;
  job: ListingJob;
}

export const ReportErrorButton = (props: Props) => {
  const { job, intl } = props;

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const togglePopover = () => {
    if (!isPopoverOpen) {
      setPopoverIsOpen(true);
    } else {
      setPopoverIsOpen(false);
    }
  };

  const errorMessage = job.getError();
  if (!errorMessage) {
    return null;
  }

  const button = (
    <EuiToolTip
      position="top"
      content={props.intl.formatMessage({
        id: 'xpack.reporting.errorButton.seeError',
        defaultMessage: 'See error message',
      })}
    >
      <EuiButtonIcon
        onClick={togglePopover}
        iconType="alert"
        color={'danger'}
        aria-label={intl.formatMessage({
          id: 'xpack.reporting.errorButton.showReportErrorAriaLabel',
          defaultMessage: 'Show report error',
        })}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      id="popover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      anchorPosition="downRight"
    >
      <EuiCallOut
        color="danger"
        title={props.intl.formatMessage({
          id: 'xpack.reporting.errorButton.unableToGenerateReportTitle',
          defaultMessage: 'Unable to generate report',
        })}
      >
        {errorMessage}
      </EuiCallOut>
    </EuiPopover>
  );
};
