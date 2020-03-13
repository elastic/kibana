/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { JobStatuses } from '../../../constants';
import { Job, Props as ListingProps } from '../report_listing';
import { ReportErrorButton as ErrorButton } from './report_error_button';

export const ReportErrorButton = ({ record, ...props }: { record: Job } & ListingProps) => {
  if (record.status !== JobStatuses.FAILED) {
    return null;
  }

  return <ErrorButton apiClient={props.apiClient} jobId={record.id} />;
};

export { ReportDeleteButton } from './report_delete_button';
export { ReportDownloadButton } from './report_download_button';
export { ReportInfoButton } from './report_info_button';
