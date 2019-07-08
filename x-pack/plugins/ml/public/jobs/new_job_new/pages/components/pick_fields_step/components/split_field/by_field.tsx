/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useContext, useEffect, useState } from 'react';

import { SplitFieldSelect } from './split_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import {
  isMultiMetricJobCreator,
  PopulationJobCreator,
  isPopulationJobCreator,
} from '../../../../../common/job_creator';

interface Props {
  detectorIndex: number;
}

export const ByFieldSelector: FC<Props> = ({ detectorIndex }) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  if (isMultiMetricJobCreator(jc) === false && isPopulationJobCreator(jc) === false) {
    return <Fragment />;
  }
  const jobCreator = jc as PopulationJobCreator;

  const { categoryFields } = newJobCapsService;

  const [byField, setByField] = useState(jobCreator.getByField(detectorIndex));

  useEffect(
    () => {
      jobCreator.setByField(byField, detectorIndex);
      jobCreatorUpdate();
    },
    [byField]
  );

  useEffect(
    () => {
      const bf = jobCreator.getByField(detectorIndex);
      setByField(bf);
    },
    [jobCreatorUpdated]
  );

  return (
    <SplitFieldSelect fields={categoryFields} changeHandler={setByField} selectedField={byField} />
  );
};
