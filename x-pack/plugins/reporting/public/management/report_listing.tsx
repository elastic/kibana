/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import './report_listing.scss';
import { useInternalApiClient, useKibana } from '@kbn/reporting-public';
import { ReportListingStateful } from './stateful/report_listing_stateful';
import { ReportListingDefault } from './default/report_listing_default';
import { ListingProps } from '.';

export const ReportListing = (props: ListingProps) => {
  const { apiClient } = useInternalApiClient();
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();
  return props.config.statefulSettings.enabled ? (
    <ReportListingStateful {...props} apiClient={apiClient} capabilities={capabilities} />
  ) : (
    <ReportListingDefault {...props} apiClient={apiClient} capabilities={capabilities} />
  );
};
