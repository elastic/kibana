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
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { Description } from './description';

import { CategorizationPerPartitionSwitch } from './categorization_per_partition_switch';
import { CategorizationPerPartitionFieldSelect } from './categorization_per_partition_input';
import { CategorizationPerPartitionStopOnWarnSwitch } from './categorization_stop_on_warn_switch';

export const CategorizationPerPartitionField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator | CategorizationJobCreator;
  const [enablePerPartitionCategorization, setEnablePerPartitionCategorization] = useState(false);
  const [categorizationPartitionFieldName, setCategorizationPartitionFieldName] = useState<
    string | null
  >(jobCreator.categorizationPerPartitionField);

  const { catFields } = newJobCapsService;

  const filteredCategories = catFields.filter((c) => c.id !== jobCreator.categorizationFieldName);

  useEffect(() => {
    jobCreator.categorizationPerPartitionField = categorizationPartitionFieldName;
    jobCreatorUpdate();
  }, [categorizationPartitionFieldName]);

  useEffect(() => {
    // set the first item in category as partition field by default
    // because API requires partition_field to be defined in each detector with mlcategory
    // if per-partition categorization is enabled
    if (
      jobCreator.perPartitionCategorization &&
      jobCreator.categorizationPerPartitionField === null &&
      filteredCategories.length > 0
    ) {
      jobCreator.categorizationPerPartitionField = filteredCategories[0].id;
    }
    setCategorizationPartitionFieldName(jobCreator.categorizationPerPartitionField);
    setEnablePerPartitionCategorization(jobCreator.perPartitionCategorization);
  }, [jobCreatorUpdated]);

  const isCategorizationJob = isCategorizationJobCreator(jobCreator);
  return (
    <Description isOptional={isCategorizationJob === false}>
      <EuiFormRow
        label={
          <FormattedMessage
            id={
              'xpack.ml.newJob.wizard.extraStep.categorizationJob.perPartitionCategorizationLabel'
            }
            defaultMessage={'Enable per-partition categorization'}
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
                id={'xpack.ml.newJob.wizard.extraStep.categorizationJob.stopOnWarnLabel'}
                defaultMessage={'Stop on warn'}
              />
            }
          >
            <CategorizationPerPartitionStopOnWarnSwitch />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id={'xpack.ml.newJob.wizard.extraStep.categorizationJob.partitionFieldLabel'}
                defaultMessage={'Partition field'}
              />
            }
          >
            <CategorizationPerPartitionFieldSelect
              fields={filteredCategories}
              changeHandler={setCategorizationPartitionFieldName}
              selectedField={categorizationPartitionFieldName || ''}
            />
          </EuiFormRow>
        </>
      )}
    </Description>
  );
};
