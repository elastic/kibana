/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState, useMemo } from 'react';

import { SplitFieldSelect } from '../split_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { Field } from '../../../../../../../../../common/types/fields';
import {
  newJobCapsService,
  filterCategoryFields,
} from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { Description } from './description';
import {
  PopulationJobCreator,
  RareJobCreator,
  isPopulationJobCreator,
} from '../../../../../common/job_creator';

export const PopulationFieldSelector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as PopulationJobCreator | RareJobCreator;

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

  const [populationField, setPopulationField] = useState(jobCreator.populationField);

  useEffect(() => {
    jobCreator.setPopulationField(populationField);
    // add the split field to the influencers
    if (
      populationField !== null &&
      jobCreator.influencers.includes(populationField.name) === false
    ) {
      jobCreator.addInfluencer(populationField.name);
    }
    jobCreatorUpdate();
  }, [populationField]);

  useEffect(() => {
    setPopulationField(jobCreator.populationField);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <SplitFieldSelect
        fields={categoryFields}
        changeHandler={setPopulationField}
        selectedField={populationField}
        isClearable={false}
        testSubject="mlPopulationSplitFieldSelect"
      />
    </Description>
  );
};

// remove the rare (by) field from the by field options in the rare wizard
function useFilteredCategoryFields(
  allCategoryFields: Field[],
  jobCreator: PopulationJobCreator | RareJobCreator,
  jobCreatorUpdated: number
) {
  const [fields, setFields] = useState(allCategoryFields);

  useEffect(() => {
    if (isPopulationJobCreator(jobCreator)) {
      setFields(allCategoryFields);
    } else {
      const rf = jobCreator.rareField;
      const sf = jobCreator.splitField;
      if (rf !== null || sf !== null) {
        setFields(allCategoryFields.filter(({ name }) => name !== rf?.name && name !== sf?.name));
      } else {
        setFields(allCategoryFields);
      }
    }
  }, [jobCreatorUpdated]);

  return fields;
}
