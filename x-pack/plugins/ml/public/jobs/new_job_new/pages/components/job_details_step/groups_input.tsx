/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiComboBox,
  EuiComboBoxOptionProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobCreatorContext } from '../job_creator_context';
import { tabColor } from '../../../../../../common/util/group_color_utils';

interface Props {
  selectedGroupNames: string[];
  setSelectedGroupNames: (groupNames: string[]) => void;
}

export const GroupsInput: FC<Props> = ({ selectedGroupNames, setSelectedGroupNames }) => {
  const { existingJobsAndGroups } = useContext(JobCreatorContext);

  const groups: EuiComboBoxOptionProps[] = existingJobsAndGroups.groups.map((g: string) => ({
    label: g,
    color: tabColor(g),
  }));

  const selectedGroups: EuiComboBoxOptionProps[] = selectedGroupNames.map((g: string) => ({
    label: g,
    color: tabColor(g),
  }));

  function setSelectedGroups(options: EuiComboBoxOptionProps[]) {
    setSelectedGroupNames(options.map(g => g.label));
  }

  function onCreateGroup(input: string, flattenedOptions: EuiComboBoxOptionProps[]) {
    const normalizedSearchValue = input.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newGroup: EuiComboBoxOptionProps = {
      label: input,
      color: tabColor(input),
    };

    if (
      flattenedOptions.findIndex(
        option => option.label.trim().toLowerCase() === normalizedSearchValue
      ) === -1
    ) {
      groups.push(newGroup);
    }

    setSelectedGroupNames([...selectedGroups, newGroup].map(g => g.label));
  }

  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>Groups</h3>}
      description={
        <Fragment>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Fragment>
      }
    >
      <EuiFormRow label="Groups" describedByIds={['single-example-aria']}>
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.ml.dataframe.definePivot.nestedAggListConflictErrorMessage',
            {
              defaultMessage: 'Select or create groups',
            }
          )}
          options={groups}
          selectedOptions={selectedGroups}
          onChange={setSelectedGroups}
          onCreateOption={onCreateGroup}
          isClearable={true}
          // isInvalid={groupsValidationError !== ''}
          // error={groupsValidationError}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
