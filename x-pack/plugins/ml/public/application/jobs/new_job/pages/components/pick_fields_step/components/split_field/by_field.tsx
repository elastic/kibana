/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { SplitFieldSelect } from './split_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { Field } from '../../../../../../../../../common/types/fields';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { MultiMetricJobCreator, PopulationJobCreator } from '../../../../../common/job_creator';

interface Props {
  detectorIndex: number;
}

export const ByFieldSelector: FC<Props> = ({ detectorIndex }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as PopulationJobCreator;

  const { categoryFields: allCategoryFields } = newJobCapsService;

  const [byField, setByField] = useState(jobCreator.getByField(detectorIndex));
  const categoryFields = useFilteredCategoryFields(
    allCategoryFields,
    jobCreator,
    jobCreatorUpdated
  );

  useEffect(() => {
    jobCreator.setByField(byField, detectorIndex);
    // add the by field to the influencers
    if (byField !== null && jobCreator.influencers.includes(byField.name) === false) {
      jobCreator.addInfluencer(byField.name);
    }
    jobCreatorUpdate();
  }, [byField]);

  useEffect(() => {
    const bf = jobCreator.getByField(detectorIndex);
    setByField(bf);
  }, [jobCreatorUpdated]);

  return (
    <SplitFieldSelect
      fields={categoryFields}
      changeHandler={setByField}
      selectedField={byField}
      isClearable={true}
      testSubject="mlByFieldSelect"
      placeholder={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.populationField.placeholder',
        {
          defaultMessage: 'Split data',
        }
      )}
    />
  );
};

// remove the split (over) field from the by field options
function useFilteredCategoryFields(
  allCategoryFields: Field[],
  jobCreator: MultiMetricJobCreator | PopulationJobCreator,
  jobCreatorUpdated: number
) {
  const [fields, setFields] = useState(allCategoryFields);

  useEffect(() => {
    const sf = jobCreator.splitField;
    if (sf !== null) {
      setFields(allCategoryFields.filter(f => f.name !== sf.name));
    } else {
      setFields(allCategoryFields);
    }
  }, [jobCreatorUpdated]);

  return fields;
}
