/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiText } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { RareJobCreator } from '../../../../../common/job_creator';
import { RARE_DETECTOR_TYPE } from './rare_view';

interface Props {
  detectorType: RARE_DETECTOR_TYPE;
}

export const DetectorDescription: FC<Props> = ({ detectorType }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    const desc = createDetectorDescription(jobCreator, detectorType);
    setDescription(desc);
  }, [jobCreatorUpdated]);

  if (description === null) {
    return null;
  }

  return (
    <EuiText>
      <h5>{description}</h5>
    </EuiText>
  );
};

function createDetectorDescription(jobCreator: RareJobCreator, detectorType: RARE_DETECTOR_TYPE) {
  if (jobCreator.rareField === null) {
    return null;
  }

  const rareFieldName = jobCreator.rareField.id;
  const populationFieldName = jobCreator.populationField?.id;
  const splitFieldName = jobCreator.splitField?.id;

  const desc = [];

  if (detectorType === RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION) {
    desc.push('This job will detect frequently rare ');
  } else {
    desc.push('This job will detect rare ');
  }
  desc.push('values of ');
  desc.push(rareFieldName);

  if (populationFieldName !== undefined) {
    desc.push(` compared to the population of ${populationFieldName}`);
  }

  if (splitFieldName !== undefined) {
    desc.push(`, for each value of ${splitFieldName}`);
  }

  return desc.join('');
}
