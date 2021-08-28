/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AdvancedJobCreator } from '../../../../../common/job_creator/advanced_job_creator';
import { CategorizationJobCreator } from '../../../../../common/job_creator/categorization_job_creator';
import { JobCreatorContext } from '../../../job_creator_context';

export const CategorizationPerPartitionStopOnWarnSwitch: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [stopOnWarn, setStopOnWarn] = useState(jobCreator.perPartitionStopOnWarn);

  const toggleStopOnWarn = useCallback(() => setStopOnWarn(!stopOnWarn), [stopOnWarn]);

  useEffect(() => {
    jobCreator.perPartitionStopOnWarn = stopOnWarn;
    jobCreatorUpdate();
  }, [stopOnWarn]);

  useEffect(() => {
    setStopOnWarn(jobCreator.perPartitionStopOnWarn);
  }, [jobCreatorUpdated]);

  return (
    <EuiSwitch
      name="categorizationPerPartitionStopOnWarnSwitch"
      disabled={false}
      checked={stopOnWarn}
      onChange={toggleStopOnWarn}
      data-test-subj="mlJobWizardSwitchCategorizationPerPartitionStopOnWarn"
      label={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.perPartitionCategorizationtopOnWarnSwitchLabel"
          defaultMessage="Stop on warn"
        />
      }
    />
  );
};
