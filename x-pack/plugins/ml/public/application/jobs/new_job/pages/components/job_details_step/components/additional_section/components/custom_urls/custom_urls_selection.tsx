/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useContext } from 'react';
import type { CombinedJob } from '../../../../../../../../../../../common/types/anomaly_detection_jobs/combined_job';
import type { UrlConfig } from '../../../../../../../../../../../common/types/custom_urls';
import { CustomUrls } from '../../../../../../../../jobs_list/components/edit_job_flyout/tabs/custom_urls';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';

export const CustomUrlsSelection: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);

  const setCustomUrls = (customUrls: UrlConfig[]) => {
    jobCreator.customUrls = customUrls;
    jobCreatorUpdate();
  };

  const combinedJob: CombinedJob = {
    ...jobCreator.jobConfig,
    datafeed_config: jobCreator.datafeedConfig,
  };

  return (
    <Description>
      <CustomUrls
        job={combinedJob}
        jobCustomUrls={jobCreator.customUrls ?? []}
        setCustomUrls={setCustomUrls}
        editMode="modal"
      />
    </Description>
  );
};
