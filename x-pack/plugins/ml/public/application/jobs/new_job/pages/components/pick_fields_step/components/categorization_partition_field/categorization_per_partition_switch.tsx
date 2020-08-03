/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import {
  AdvancedJobCreator,
  CategorizationJobCreator,
  isCategorizationJobCreator,
} from '../../../../../common/job_creator';

export const CategorizationPerPartitionSwitch: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [enablePerPartitionCategorization, setEnablePerPartitionCategorization] = useState(false);

  const toggleEnablePerPartitionCategorization = () =>
    setEnablePerPartitionCategorization(!enablePerPartitionCategorization);

  useEffect(() => {
    if (isCategorizationJobCreator(jobCreator)) {
      jobCreator.perPartitionCategorization = enablePerPartitionCategorization;
      jobCreatorUpdate();
    }
  }, [enablePerPartitionCategorization]);

  return (
    <EuiSwitch
      name="switch"
      disabled={false}
      checked={enablePerPartitionCategorization}
      onChange={toggleEnablePerPartitionCategorization}
      data-test-subj="mlJobWizardSwitchCategorizationPerPartitionField"
      label={i18n.translate('xpack.ml.newJob.wizard.perPartitionCategorizationSwitchLabel', {
        defaultMessage: 'Enable per-partition categorization',
      })}
    />
  );
};
