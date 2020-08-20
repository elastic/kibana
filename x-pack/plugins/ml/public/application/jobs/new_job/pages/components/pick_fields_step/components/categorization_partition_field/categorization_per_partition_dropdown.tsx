/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, SetStateAction, useContext, useEffect, useState, useMemo } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities_service';
import { CategorizationPerPartitionFieldSelect } from './categorization_per_partition_input';

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

  const filteredCategories = useMemo(
    () => categoryFields.filter((c) => c.id !== jobCreator.categorizationFieldName),
    [categoryFields, jobCreatorUpdated]
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
          id="xpack.ml.newJob.wizard.extraStep.categorizationJob.categorizationPerPartitionFieldLabel"
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
