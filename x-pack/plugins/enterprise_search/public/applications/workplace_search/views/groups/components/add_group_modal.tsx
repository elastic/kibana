/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';
import { i18n } from '@kbn/i18n';

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

const ADD_GROUP_HEADER = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.addGroup.heading',
  {
    defaultMessage: 'Add a group',
  }
);
const ADD_GROUP_CANCEL = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.addGroup.cancel.action',
  {
    defaultMessage: 'Cancel',
  }
);
const ADD_GROUP_SUBMIT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.addGroup.submit.action',
  {
    defaultMessage: 'Add Group',
  }
);

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
            <EuiModalHeaderTitle>{ADD_GROUP_HEADER}</EuiModalHeaderTitle>
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
            <EuiButtonEmpty onClick={closeNewGroupModal}>{ADD_GROUP_CANCEL}</EuiButtonEmpty>
            <EuiButton
              disabled={!newGroupName}
              onClick={saveNewGroup}
              fill={true}
              data-test-subj="AddGroupSubmit"
            >
              {ADD_GROUP_SUBMIT}
            </EuiButton>
          </EuiModalFooter>
        </form>
      </EuiModal>
    </EuiOverlayMask>
  );
};
