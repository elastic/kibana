/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';

import { ML_JOB_AGGREGATION } from '../../../../../../../../../common/constants/aggregation_types';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { CountCard, RareCard } from './detector_cards';

export const CategorizationDetector: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;
  const [categorizationDetectorType, setCategorizationDetectorType] = useState(
    jobCreator.selectedDetectorType
  );

  useEffect(() => {
    if (categorizationDetectorType !== jobCreator.selectedDetectorType) {
      jobCreator.setDetectorType(categorizationDetectorType);
      jobCreatorUpdate();
    }
  }, [categorizationDetectorType]);

  useEffect(() => {
    setCategorizationDetectorType(jobCreator.selectedDetectorType);
  }, [jobCreatorUpdated]);

  function onCountSelection() {
    setCategorizationDetectorType(ML_JOB_AGGREGATION.COUNT);
  }
  function onRareSelection() {
    setCategorizationDetectorType(ML_JOB_AGGREGATION.RARE);
  }

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.title"
            defaultMessage="Categorization detector"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="l" style={{ maxWidth: '824px' }}>
        <CountCard
          onClick={onCountSelection}
          isSelected={categorizationDetectorType === ML_JOB_AGGREGATION.COUNT}
        />
        <RareCard
          onClick={onRareSelection}
          isSelected={categorizationDetectorType === ML_JOB_AGGREGATION.RARE}
        />
      </EuiFlexGroup>
    </>
  );
};
