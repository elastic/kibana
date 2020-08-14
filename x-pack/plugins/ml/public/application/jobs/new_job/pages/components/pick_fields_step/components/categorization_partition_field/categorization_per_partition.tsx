/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState, Dispatch, SetStateAction } from 'react';
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

export const CategorizationPerPartitionFieldDropdown = ({
  setEnablePerPartitionCategorization,
}: {
  setEnablePerPartitionCategorization: Dispatch<SetStateAction<boolean>>;
}) => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;

  const [categorizationPartitionFieldName, setCategorizationPartitionFieldName] = useState<
    string | null
  >(jobCreator.categorizationPerPartitionField);
  const { categoryFields } = newJobCapsService;

  const filteredCategories = categoryFields.filter(
    (c) => c.id !== jobCreator.categorizationFieldName
  );
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
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.extraStep.categorizationJob.partitionFieldLabel"
          defaultMessage="Partition field"
        />
      }
    >
      <CategorizationPerPartitionFieldSelect
        fields={filteredCategories}
        changeHandler={setCategorizationPartitionFieldName}
        selectedField={categorizationPartitionFieldName || ''}
      />
    </EuiFormRow>
  );
};
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
