/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState, useMemo } from 'react';

import { SplitFieldSelect } from '../split_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import {
  newJobCapsService,
  filterCategoryFields,
} from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { Description } from './description';
import { Field } from '../../../../../../../../../common/types/fields';
import {
  MultiMetricJobCreator,
  RareJobCreator,
  isMultiMetricJobCreator,
} from '../../../../../common/job_creator';

export const SplitFieldSelector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as MultiMetricJobCreator | RareJobCreator;

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
    <Description>
      <SplitFieldSelect
        fields={categoryFields}
        changeHandler={setSplitField}
        selectedField={splitField}
        isClearable={true}
        testSubject="mlMultiMetricSplitFieldSelect"
      />
    </Description>
  );
};

// remove the rare (by) and population (over) fields from the by field options in the rare wizard
function useFilteredCategoryFields(
  allCategoryFields: Field[],
  jobCreator: MultiMetricJobCreator | RareJobCreator,
  jobCreatorUpdated: number
) {
  const [fields, setFields] = useState(allCategoryFields);

  useEffect(() => {
    if (isMultiMetricJobCreator(jobCreator)) {
      setFields(allCategoryFields);
    } else {
      const rf = jobCreator.rareField;
      const pf = jobCreator.populationField;
      if (rf !== null || pf !== null) {
        setFields(allCategoryFields.filter(({ name }) => name !== rf?.name && name !== pf?.name));
      } else {
        setFields(allCategoryFields);
      }
    }
  }, [jobCreatorUpdated]);

  return fields;
}
