/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobCreatorContext } from '../../../job_creator_context';
import {
  AdvancedJobCreator,
  CategorizationJobCreator,
  isCategorizationJobCreator,
} from '../../../../../common/job_creator';

import { Description } from './description';

import { CategorizationPerPartitionSwitch } from './categorization_per_partition_switch';
import { CategorizationPerPartitionStopOnWarnSwitch } from './categorization_stop_on_warn_switch';
import { CategorizationPerPartitionFieldDropdown } from './categorization_per_partition_dropdown';

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
