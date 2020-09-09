/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { GroupsLogic } from '../groups_logic';

export const AddGroupModal: React.FC<{}> = () => {
  const { closeNewGroupModal, saveNewGroup, setNewGroupName } = useActions(GroupsLogic);
  const { newGroupNameErrors, newGroupName } = useValues(GroupsLogic);
  const isInvalid = newGroupNameErrors.length > 0;
  const handleFormSumbit = (e: React.FormEvent) => {
    e.preventDefault();
    saveNewGroup();
  };

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeNewGroupModal} initialFocus=".euiFieldText">
        <form onSubmit={handleFormSumbit}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Add a group</EuiModalHeaderTitle>
          </EuiModalHeader>

          <EuiModalBody>
            <EuiFormRow isInvalid={isInvalid} error={newGroupNameErrors} label="Group name">
              <EuiFieldText
                isInvalid={isInvalid}
                value={newGroupName}
                data-test-subj="AddGroupInput"
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </EuiFormRow>
          </EuiModalBody>

          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeNewGroupModal}>Cancel</EuiButtonEmpty>
            <EuiButton
              disabled={!newGroupName}
              onClick={saveNewGroup}
              fill={true}
              data-test-subj="AddGroupSubmit"
            >
              Add Group
            </EuiButton>
          </EuiModalFooter>
        </form>
      </EuiModal>
    </EuiOverlayMask>
  );
};
