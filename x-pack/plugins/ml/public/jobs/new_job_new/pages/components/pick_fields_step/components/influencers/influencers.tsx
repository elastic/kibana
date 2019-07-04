/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useEffect, useState } from 'react';

import { InfluencersSelect } from './influencers_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import {
  MultiMetricJobCreator,
  isMultiMetricJobCreator,
  PopulationJobCreator,
  isPopulationJobCreator,
} from '../../../../../common/job_creator';

export const Influencers: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  if (isMultiMetricJobCreator(jc) === false && isPopulationJobCreator(jc) === false) {
    return <Fragment />;
  }

  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator;
  const { fields } = newJobCapsService;

  const [influencers, setInfluencers] = useState(jobCreator.influencers);
  const [splitField, setSplitField] = useState(jobCreator.splitField);

  useEffect(
    () => {
      jobCreator.removeAllInfluencers();
      influencers.forEach(i => jobCreator.addInfluencer(i));
      jobCreatorUpdate();
    },
    [influencers.join()]
  );

  useEffect(
    () => {
      // if the split field has changed auto add it to the influencers
      if (splitField !== null && influencers.includes(splitField.name) === false) {
        setInfluencers([...influencers, splitField.name]);
      }
    },
    [splitField]
  );

  useEffect(
    () => {
      setSplitField(jobCreator.splitField);
      setInfluencers(jobCreator.influencers);
    },
    [jobCreatorUpdated]
  );

  return (
    <InfluencersSelect
      fields={fields}
      changeHandler={setInfluencers}
      selectedInfluencers={influencers}
      splitField={splitField}
    />
  );
};
