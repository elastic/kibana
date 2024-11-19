/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useContext, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';

export const DedicatedIndexSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [useDedicatedIndex, setUseDedicatedIndex] = useState(jobCreator.useDedicatedIndex);

  useEffect(() => {
    jobCreator.useDedicatedIndex = useDedicatedIndex;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useDedicatedIndex]);

  function toggleModelPlot() {
    setUseDedicatedIndex(!useDedicatedIndex);
  }

  return (
    <Description>
      <EuiSwitch
        name="switch"
        checked={useDedicatedIndex}
        onChange={toggleModelPlot}
        data-test-subj="mlJobWizardSwitchUseDedicatedIndex"
        label={i18n.translate(
          'xpack.ml.newJob.wizard.jobDetailsStep.advancedSection.useDedicatedIndex.title',
          {
            defaultMessage: 'Use dedicated index',
          }
        )}
      />
    </Description>
  );
};
