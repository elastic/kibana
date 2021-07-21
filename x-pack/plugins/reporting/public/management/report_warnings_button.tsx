/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiButtonIcon, EuiCallOut, EuiPopover } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React, { useState } from 'react';
import { Job as ListingJob } from '../lib/job';
import { Props as ListingProps } from './report_listing';

type Props = { job: ListingJob } & ListingProps;

export const ReportWarningsButton: FunctionComponent<Props> = (props: Props) => {
  const { job, intl } = props;

  const [isPopoverOpen, setPopoverIsOpen] = useState(false);

  const togglePopover = () => {
    if (!isPopoverOpen) {
      setPopoverIsOpen(true);
    } else {
      setPopoverIsOpen(false);
    }
  };

  const warnings = job.getWarnings();
  if (!warnings) {
    return null;
  }

  const button = (
    <EuiToolTip
      position="top"
      content={props.intl.formatMessage({
        id: 'xpack.reporting.errorButton.seeWarnings',
        defaultMessage: 'See warning messages',
      })}
    >
      <EuiButtonIcon
        onClick={togglePopover}
        iconType="alert"
        color="warning"
        aria-label={intl.formatMessage({
          id: 'xpack.reporting.listing.table.warningsReportAriaLabel',
          defaultMessage: 'See warning messages',
        })}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      id="warnings_popover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverIsOpen(false)}
      anchorPosition="downRight"
    >
      <EuiCallOut
        color="danger"
        title={props.intl.formatMessage({
          id: 'xpack.reporting.warningsButton.reportHasWarnings',
          defaultMessage: 'This report has warnings',
        })}
      >
        {warnings}
      </EuiCallOut>
    </EuiPopover>
  );
};
