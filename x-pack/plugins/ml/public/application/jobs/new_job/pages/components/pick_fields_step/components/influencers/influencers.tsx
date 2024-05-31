/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';

import { InfluencersSelect } from './influencers_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import type {
  MultiMetricJobCreator,
  PopulationJobCreator,
  AdvancedJobCreator,
} from '../../../../../common/job_creator';
import { Description } from './description';

export const Influencers: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator | AdvancedJobCreator;
  const { fields } = newJobCapsService;
  const [influencers, setInfluencers] = useState([...jobCreator.influencers]);

  useEffect(() => {
    jobCreator.removeAllInfluencers();
    influencers.forEach((i) => jobCreator.addInfluencer(i));
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [influencers.join()]);

  useEffect(() => {
    setInfluencers([...jobCreator.influencers]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
