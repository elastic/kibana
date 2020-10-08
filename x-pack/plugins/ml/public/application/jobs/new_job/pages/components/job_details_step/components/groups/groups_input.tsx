/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../../../job_creator_context';
import { tabColor } from '../../../../../../../../../common/util/group_color_utils';
import { Description } from './description';

export const GroupsInput: FC = () => {
  const { jobCreator, jobCreatorUpdate, jobValidator, jobValidatorUpdated } = useContext(
    JobCreatorContext
  );
  const { existingJobsAndGroups } = useContext(JobCreatorContext);
  const [selectedGroups, setSelectedGroups] = useState(jobCreator.groups);
  const [validation, setValidation] = useState(jobValidator.groupIds);

  useEffect(() => {
    jobCreator.groups = selectedGroups;
    jobCreatorUpdate();
  }, [selectedGroups.join()]);

  const options: EuiComboBoxOptionOption[] = existingJobsAndGroups.groupIds.map((g: string) => ({
    label: g,
    color: tabColor(g),
  }));

  const selectedOptions: EuiComboBoxOptionOption[] = selectedGroups.map((g: string) => ({
    label: g,
    color: tabColor(g),
  }));

  function onChange(optionsIn: EuiComboBoxOptionOption[]) {
    setSelectedGroups(optionsIn.map((g) => g.label));
  }

  function onCreateGroup(input: string, flattenedOptions: EuiComboBoxOptionOption[]) {
    const normalizedSearchValue = input.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newGroup: EuiComboBoxOptionOption = {
      label: input,
      color: tabColor(input),
    };

    if (
      flattenedOptions.findIndex(
        (option) => option.label.trim().toLowerCase() === normalizedSearchValue
      ) === -1
    ) {
      options.push(newGroup);
    }

    setSelectedGroups([...selectedOptions, newGroup].map((g) => g.label));
  }

  useEffect(() => {
    setValidation(jobValidator.groupIds);
  }, [jobValidatorUpdated]);

  return (
    <Description validation={validation}>
      <EuiComboBox
        placeholder={i18n.translate(
          'xpack.ml.newJob.wizard.jobDetailsStep.jobGroupSelect.placeholder',
          {
            defaultMessage: 'Select or create groups',
          }
        )}
        options={options}
        selectedOptions={selectedOptions}
        onChange={onChange}
        onCreateOption={onCreateGroup}
        isClearable={true}
        isInvalid={validation.valid === false}
        data-test-subj="mlJobWizardComboBoxJobGroups"
      />
    </Description>
  );
};
