/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { AdvancedJobCreator } from '../../../../../common/job_creator/advanced_job_creator';
import { CategorizationJobCreator } from '../../../../../common/job_creator/categorization_job_creator';
import { isCategorizationJobCreator } from '../../../../../common/job_creator/type_guards';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationPerPartitionFieldDropdown } from './categorization_per_partition_dropdown';
import { CategorizationPerPartitionSwitch } from './categorization_per_partition_switch';
import { CategorizationPerPartitionStopOnWarnSwitch } from './categorization_stop_on_warn_switch';
import { Description } from './description';

export const CategorizationPerPartitionField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [enablePerPartitionCategorization, setEnablePerPartitionCategorization] = useState(false);
  useEffect(() => {
    setEnablePerPartitionCategorization(jobCreator.perPartitionCategorization);
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.newJob.wizard.extraStep.categorizationJob.perPartitionCategorizationLabel"
            defaultMessage="Enable per-partition categorization"
          />
        }
      >
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
