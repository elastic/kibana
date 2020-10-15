/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { CategorizationFieldSelect } from './categorization_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import {
  AdvancedJobCreator,
  CategorizationJobCreator,
  isCategorizationJobCreator,
} from '../../../../../common/job_creator';
import { Description } from './description';

export const CategorizationField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const { catFields } = newJobCapsService;
  const [categorizationFieldName, setCategorizationFieldName] = useState(
    jobCreator.categorizationFieldName
  );
  const isCategorizationJob = isCategorizationJobCreator(jobCreator);

  useEffect(() => {
    if (jobCreator.categorizationFieldName !== categorizationFieldName) {
      jobCreator.categorizationFieldName = categorizationFieldName;
      jobCreatorUpdate();
    }
  }, [categorizationFieldName]);

  useEffect(() => {
    setCategorizationFieldName(jobCreator.categorizationFieldName);
  }, [jobCreatorUpdated]);

  return (
    <Description isOptional={isCategorizationJob === false}>
      <CategorizationFieldSelect
        fields={catFields}
        changeHandler={setCategorizationFieldName}
        selectedField={categorizationFieldName}
      />
    </Description>
  );
};
