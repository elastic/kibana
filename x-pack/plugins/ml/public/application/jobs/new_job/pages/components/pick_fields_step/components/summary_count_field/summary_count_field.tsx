/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { SummaryCountFieldSelect } from './summary_count_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import {
  MultiMetricJobCreator,
  PopulationJobCreator,
  AdvancedJobCreator,
} from '../../../../../common/job_creator';
import { Description } from './description';

export const SummaryCountField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);

  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator | AdvancedJobCreator;
  const { fields } = newJobCapsService;
  const [summaryCountFieldName, setSummaryCountFieldName] = useState(
    jobCreator.summaryCountFieldName
  );

  useEffect(() => {
    jobCreator.summaryCountFieldName = summaryCountFieldName;
    jobCreatorUpdate();
  }, [summaryCountFieldName]);

  useEffect(() => {
    setSummaryCountFieldName(jobCreator.summaryCountFieldName);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <SummaryCountFieldSelect
        fields={fields}
        changeHandler={setSummaryCountFieldName}
        selectedField={summaryCountFieldName}
      />
    </Description>
  );
};
