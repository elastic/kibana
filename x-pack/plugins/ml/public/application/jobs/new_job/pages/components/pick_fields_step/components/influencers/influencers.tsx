/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { AdvancedJobCreator } from '../../../../../common/job_creator/advanced_job_creator';
import { MultiMetricJobCreator } from '../../../../../common/job_creator/multi_metric_job_creator';
import { PopulationJobCreator } from '../../../../../common/job_creator/population_job_creator';
import { JobCreatorContext } from '../../../job_creator_context';
import { Description } from './description';
import { InfluencersSelect } from './influencers_select';

export const Influencers: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator | AdvancedJobCreator;
  const { fields } = newJobCapsService;
  const [influencers, setInfluencers] = useState([...jobCreator.influencers]);

  useEffect(() => {
    jobCreator.removeAllInfluencers();
    influencers.forEach((i) => jobCreator.addInfluencer(i));
    jobCreatorUpdate();
  }, [influencers.join()]);

  useEffect(() => {
    setInfluencers([...jobCreator.influencers]);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <InfluencersSelect
        fields={fields}
        changeHandler={setInfluencers}
        selectedInfluencers={influencers}
      />
    </Description>
  );
};
