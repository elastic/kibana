/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState, useMemo } from 'react';

import type { Field } from '@kbn/ml-anomaly-utils';
import { RareFieldSelect } from './rare_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { filterCategoryFields } from '../../../../../../../../../common/util/fields_utils';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { Description } from './description';
import type { RareJobCreator } from '../../../../../common/job_creator';

export const RareFieldSelector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runtimeCategoryFields = useMemo(() => filterCategoryFields(jobCreator.runtimeFields), []);
  const allCategoryFields = useMemo(
    () =>
      [...newJobCapsService.categoryFields, ...runtimeCategoryFields].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rareField]);

  useEffect(() => {
    setRareField(jobCreator.rareField);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return fields;
}
