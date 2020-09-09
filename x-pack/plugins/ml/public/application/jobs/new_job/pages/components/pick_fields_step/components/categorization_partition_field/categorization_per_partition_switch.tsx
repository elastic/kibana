/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator, CategorizationJobCreator } from '../../../../../common/job_creator';

export const CategorizationPerPartitionSwitch: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [enablePerPartitionCategorization, setEnablePerPartitionCategorization] = useState(
    jobCreator.perPartitionCategorization
  );

  const toggleEnablePerPartitionCategorization = useCallback(
    () => setEnablePerPartitionCategorization(!enablePerPartitionCategorization),
    [enablePerPartitionCategorization]
  );

  useEffect(() => {
    setEnablePerPartitionCategorization(jobCreator.perPartitionCategorization);
  }, [jobCreatorUpdated]);

  useEffect(() => {
    // also turn off stop on warn if per_partition_categorization is turned off
    if (enablePerPartitionCategorization === false) {
      jobCreator.perPartitionStopOnWarn = false;
    }

    jobCreator.perPartitionCategorization = enablePerPartitionCategorization;
    jobCreatorUpdate();
  }, [enablePerPartitionCategorization]);

  return (
    <EuiSwitch
      name="categorizationPerPartitionSwitch"
      disabled={false}
      checked={enablePerPartitionCategorization}
      onChange={toggleEnablePerPartitionCategorization}
      data-test-subj="mlJobWizardSwitchCategorizationPerPartition"
      label={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.perPartitionCategorizationSwitchLabel"
          defaultMessage="Enable per-partition categorization"
        />
      }
    />
  );
};
