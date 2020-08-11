/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator, CategorizationJobCreator } from '../../../../../common/job_creator';

export const CategorizationPerPartitionStopOnWarnSwitch: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [stopOnWarn, setStopOnWarn] = useState(jobCreator.partitionStopOnWarn);

  const toggleStopOnWarn = () => setStopOnWarn(!stopOnWarn);

  useEffect(() => {
    jobCreator.partitionStopOnWarn = stopOnWarn;
    jobCreatorUpdate();
  }, [stopOnWarn]);

  return (
    <EuiSwitch
      name="switch"
      disabled={false}
      checked={stopOnWarn}
      onChange={toggleStopOnWarn}
      data-test-subj="mlJobWizardSwitchCategorizationPerPartitionStopOnWarn"
      label={i18n.translate(
        'xpack.ml.newJob.wizard.perPartitionCategorizationtopOnWarnSwitchLabel',
        {
          defaultMessage: 'Stop on warn',
        }
      )}
    />
  );
};
