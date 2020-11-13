/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator, CategorizationJobCreator } from '../../../../../common/job_creator';

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
