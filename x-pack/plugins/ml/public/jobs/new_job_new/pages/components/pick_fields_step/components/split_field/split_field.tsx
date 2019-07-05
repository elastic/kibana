/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useEffect, useState } from 'react';

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

interface Props {
  detectorIndex?: number;
}

export const SplitFieldSelector: FC<Props> = ({ detectorIndex }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  if (isMultiMetricJobCreator(jc) === false && isPopulationJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as MultiMetricJobCreator | PopulationJobCreator;

  const { categoryFields } = newJobCapsService;
  const [splitField, setSplitField] = useState(jobCreator.splitField);
  useEffect(
    () => {
      if (
        isMultiMetricJobCreator(jobCreator) ||
        (isPopulationJobCreator(jobCreator) && detectorIndex === undefined)
      ) {
        jobCreator.setSplitField(splitField);
      } else if (isPopulationJobCreator(jobCreator) && detectorIndex !== undefined) {
        jobCreator.setByField(splitField, detectorIndex);
      }
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
    <Description jobType={jobCreator.type}>
      <SplitFieldSelect
        fields={categoryFields}
        changeHandler={setSplitField}
        selectedField={splitField}
      />
    </Description>
  );
};
