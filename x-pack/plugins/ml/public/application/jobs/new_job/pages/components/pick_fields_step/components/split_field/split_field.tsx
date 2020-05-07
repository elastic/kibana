/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { SplitFieldSelect } from './split_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Description } from './description';
import {
  MultiMetricJobCreator,
  isMultiMetricJobCreator,
  PopulationJobCreator,
  isPopulationJobCreator,
} from '../../../../../common/job_creator';

export const SplitFieldSelector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator;
  const canClearSelection = isMultiMetricJobCreator(jc);

  const { categoryFields } = newJobCapsService;
  const [splitField, setSplitField] = useState(jobCreator.splitField);

  useEffect(() => {
    jobCreator.setSplitField(splitField);
    // add the split field to the influencers
    if (splitField !== null && jobCreator.influencers.includes(splitField.name) === false) {
      jobCreator.addInfluencer(splitField.name);
    }
    jobCreatorUpdate();
  }, [splitField]);

  useEffect(() => {
    setSplitField(jobCreator.splitField);
  }, [jobCreatorUpdated]);

  return (
    <Description jobType={jobCreator.type}>
      <SplitFieldSelect
        fields={categoryFields}
        changeHandler={setSplitField}
        selectedField={splitField}
        isClearable={canClearSelection}
        testSubject={
          isMultiMetricJobCreator(jc)
            ? 'mlMultiMetricSplitFieldSelect'
            : isPopulationJobCreator(jc)
            ? 'mlPopulationSplitFieldSelect'
            : undefined
        }
      />
    </Description>
  );
};
