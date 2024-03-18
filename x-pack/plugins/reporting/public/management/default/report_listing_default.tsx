/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { ListingPropsInternal } from '..';
import { ReportListingTable } from '../report_listing_table';

/**
 * Used in non-stateful (Serverless)
 * Does not render controls for features only applicable in Stateful
 */
export const ReportListingDefault: FC<ListingPropsInternal> = (props) => {
  const { apiClient, capabilities, config, navigateToUrl, toasts, urlService, ...listingProps } =
    props;
  return (
    <>
      <EuiPageHeader
        data-test-subj="reportingPageHeader"
        bottomBorder
        pageTitle={
          <FormattedMessage id="xpack.reporting.listing.reportstitle" defaultMessage="Reports" />
        }
        description={
          <FormattedMessage
            id="xpack.reporting.listing.reports.subtitle"
            defaultMessage="Get reports generated in Kibana applications."
          />
        }
      />
      <EuiSpacer size={'l'} />
      <ReportListingTable
        {...listingProps}
        apiClient={apiClient}
        capabilities={capabilities}
        config={config}
        toasts={toasts}
        navigateToUrl={navigateToUrl}
        urlService={urlService}
      />
    </>
  );
};
