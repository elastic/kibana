/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState, useMemo } from 'react';

import { RareFieldSelect } from './rare_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import {
  newJobCapsService,
  filterCategoryFields,
} from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { Description } from './description';
import { RareJobCreator } from '../../../../../common/job_creator';

export const RareFieldSelector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;

  const runtimeCategoryFields = useMemo(() => filterCategoryFields(jobCreator.runtimeFields), []);
  const categoryFields = useMemo(
    () => [...newJobCapsService.categoryFields, ...runtimeCategoryFields],
    []
  );
  const [rareField, setRareField] = useState(jobCreator.rareField);

  useEffect(() => {
    jobCreator.setRareField(rareField);
    // add the split field to the influencers
    if (rareField !== null && jobCreator.influencers.includes(rareField.name) === false) {
      jobCreator.addInfluencer(rareField.name);
    }
    jobCreatorUpdate();
  }, [rareField]);

  useEffect(() => {
    setRareField(jobCreator.rareField);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <RareFieldSelect
        fields={categoryFields}
        changeHandler={setRareField}
        selectedField={rareField}
        testSubject="mlRareFieldSelect"
      />
    </Description>
  );
};
