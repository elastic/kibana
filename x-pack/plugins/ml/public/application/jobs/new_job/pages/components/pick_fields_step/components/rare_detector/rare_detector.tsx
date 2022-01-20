/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { RareJobCreator } from '../../../../../common/job_creator';
import { RareCard, RareInPopulationCard, FrequentlyRareInPopulationCard } from './detector_cards';
import { RARE_DETECTOR_TYPE } from '../rare_view';

interface Props {
  onChange(d: RARE_DETECTOR_TYPE): void;
}

export const RareDetector: FC<Props> = ({ onChange }) => {
  const { jobCreator: jc, jobCreatorUpdate } = useContext(JobCreatorContext);
  const jobCreator = jc as RareJobCreator;
  const [rareDetectorType, setRareDetectorType] = useState<RARE_DETECTOR_TYPE | null>(null);

  useEffect(() => {
    if (jobCreator.rareField !== null) {
      if (jobCreator.populationField === null) {
        setRareDetectorType(RARE_DETECTOR_TYPE.RARE);
      } else {
        setRareDetectorType(
          jobCreator.frequentlyRare
            ? RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION
            : RARE_DETECTOR_TYPE.RARE_POPULATION
        );
      }
    } else {
      setRareDetectorType(RARE_DETECTOR_TYPE.RARE);
    }
  }, []);

  useEffect(() => {
    if (rareDetectorType !== null) {
      onChange(rareDetectorType);
      if (rareDetectorType === RARE_DETECTOR_TYPE.RARE && jobCreator.populationField !== null) {
        jobCreator.removePopulationField();
      }
      jobCreator.frequentlyRare = rareDetectorType === RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION;
      jobCreatorUpdate();
    }
  }, [rareDetectorType]);

  function onRareSelection() {
    setRareDetectorType(RARE_DETECTOR_TYPE.RARE);
  }
  function onRareInPopulationSelection() {
    setRareDetectorType(RARE_DETECTOR_TYPE.RARE_POPULATION);
  }
  function onFreqRareInPopulationSelection() {
    setRareDetectorType(RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION);
  }

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.rareDetectorSelect.title"
            defaultMessage="Rare detector"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" style={{ maxWidth: '824px' }}>
        <RareCard
          onClick={onRareSelection}
          isSelected={rareDetectorType === RARE_DETECTOR_TYPE.RARE}
        />
        <RareInPopulationCard
          onClick={onRareInPopulationSelection}
          isSelected={rareDetectorType === RARE_DETECTOR_TYPE.RARE_POPULATION}
        />
        <FrequentlyRareInPopulationCard
          onClick={onFreqRareInPopulationSelection}
          isSelected={rareDetectorType === RARE_DETECTOR_TYPE.FREQ_RARE_POPULATION}
        />
      </EuiFlexGroup>
    </>
  );
};
