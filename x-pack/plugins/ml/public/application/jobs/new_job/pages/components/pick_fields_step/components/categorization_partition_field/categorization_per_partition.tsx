/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import type {
  AdvancedJobCreator,
  CategorizationJobCreator,
} from '../../../../../common/job_creator';
import { isCategorizationJobCreator } from '../../../../../common/job_creator';
import { JobCreatorContext } from '../../../job_creator_context';

import { Description } from './description';

import { CategorizationPerPartitionFieldDropdown } from './categorization_per_partition_dropdown';
import { CategorizationPerPartitionSwitch } from './categorization_per_partition_switch';
import { CategorizationPerPartitionStopOnWarnSwitch } from './categorization_stop_on_warn_switch';

export const CategorizationPerPartitionField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [enablePerPartitionCategorization, setEnablePerPartitionCategorization] = useState(false);
  useEffect(() => {
    setEnablePerPartitionCategorization(jobCreator.perPartitionCategorization);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <EuiFormRow>
        <CategorizationPerPartitionSwitch />
      </EuiFormRow>

      {enablePerPartitionCategorization && (
        <>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.newJob.wizard.extraStep.categorizationJob.stopOnWarnLabel"
                defaultMessage="Stop on warn"
              />
            }
          >
            <CategorizationPerPartitionStopOnWarnSwitch />
          </EuiFormRow>
        </>
      )}
      {isCategorizationJobCreator(jobCreator) && enablePerPartitionCategorization && (
        <CategorizationPerPartitionFieldDropdown
          setEnablePerPartitionCategorization={setEnablePerPartitionCategorization}
        />
      )}
    </Description>
  );
};
