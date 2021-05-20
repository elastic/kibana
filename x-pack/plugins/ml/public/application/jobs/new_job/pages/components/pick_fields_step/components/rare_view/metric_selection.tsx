/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { RareFieldSelector } from '../rare_field';
import { JobCreatorContext } from '../../../job_creator_context';
import { RareJobCreator } from '../../../../../common/job_creator';
import { RareDetector } from '../rare_detector';
import { PopulationFieldSelector } from '../population_field';
import { DetectorDescription } from './detector_description';

export enum RARE_DETECTOR_TYPE {
  RARE,
  RARE_POPULATION,
  FREQ_RARE_POPULATION,
}

interface Props {
  setIsValid: (na: boolean) => void;
}

export const RareDetectors: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  // const [rareField, setRareField] = useState(jobCreator.rareField);
  const [rareDetectorType, setRareDetectorType] = useState(RARE_DETECTOR_TYPE.RARE);
  const [detectorValid, setDetectorValid] = useState(false);

  useEffect(() => {
    // setRareField(jobCreator.rareField);
    let valid = false;
    if (jobCreator.rareField !== null) {
      if (rareDetectorType === RARE_DETECTOR_TYPE.RARE) {
        // Rare only requires a rare field to be set
        valid = true;
      } else if (jobCreator.populationField !== null) {
        // all others need a need the population field to be set
        valid = true;
      }
    }
    setIsValid(valid);
    setDetectorValid(valid);
  }, [jobCreatorUpdated]);

  return (
    <>
      <RareDetector onChange={setRareDetectorType} />
      <>
        <EuiHorizontalRule />
        <EuiFlexGroup>
          <EuiFlexItem>
            <RareFieldSelector />
          </EuiFlexItem>
          <EuiFlexItem>
            {rareDetectorType !== RARE_DETECTOR_TYPE.RARE && <PopulationFieldSelector />}
          </EuiFlexItem>
        </EuiFlexGroup>
        {detectorValid && (
          <>
            <EuiSpacer size="m" />
            <DetectorDescription detectorType={rareDetectorType} />
          </>
        )}
      </>
    </>
  );
};
