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
import { Field } from '../../../../../../../../../common/types/fields';
import { RareJobCreator } from '../../../../../common/job_creator';

export const RareFieldSelector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;

  const runtimeCategoryFields = useMemo(() => filterCategoryFields(jobCreator.runtimeFields), []);
  const allCategoryFields = useMemo(
    () => [...newJobCapsService.categoryFields, ...runtimeCategoryFields],
    []
  );
  const categoryFields = useFilteredCategoryFields(
    allCategoryFields,
    jobCreator,
    jobCreatorUpdated
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

// remove the rare (by) field from the by field options in the rare wizard
function useFilteredCategoryFields(
  allCategoryFields: Field[],
  jobCreator: RareJobCreator,
  jobCreatorUpdated: number
) {
  const [fields, setFields] = useState(allCategoryFields);

  useEffect(() => {
    const pf = jobCreator.populationField;
    const sf = jobCreator.splitField;
    if (pf !== null || sf !== null) {
      setFields(allCategoryFields.filter(({ name }) => name !== pf?.name && name !== sf?.name));
    } else {
      setFields(allCategoryFields);
    }
  }, [jobCreatorUpdated]);

  return fields;
}
