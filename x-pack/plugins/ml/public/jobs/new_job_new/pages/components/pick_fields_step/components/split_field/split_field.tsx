/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useEffect, useState } from 'react';

import { SplitFieldSelect } from './split_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { MultiMetricJobCreator, isMultiMetricJobCreator } from '../../../../../common/job_creator';

export const SplitField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  if (isMultiMetricJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as MultiMetricJobCreator;

  const { categoryFields } = newJobCapsService;
  const [splitField, setSplitField] = useState(jobCreator.splitField);

  useEffect(
    () => {
      jobCreator.setSplitField(splitField);
      jobCreatorUpdate();
    },
    [splitField]
  );

  useEffect(
    () => {
      setSplitField(jobCreator.splitField);
    },
    [jobCreatorUpdated]
  );

  return (
    <SplitFieldSelect
      fields={categoryFields}
      changeHandler={setSplitField}
      selectedField={splitField}
    />
  );
};
