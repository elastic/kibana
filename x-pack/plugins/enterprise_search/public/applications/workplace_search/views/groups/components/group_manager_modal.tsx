/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import noSharedSourcesIcon from '../../../assets/share_circle.svg';
import { UPDATE_BUTTON, CANCEL_BUTTON } from '../../../constants';
import { SOURCES_PATH } from '../../../routes';
import { Group } from '../../../types';
import { GroupLogic } from '../group_logic';
import { GroupsLogic } from '../groups_logic';

const ADD_SOURCE_BUTTON_TEXT = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.groupManagerUpdateAddSourceButton',
  {
    defaultMessage: 'Add a Shared Source',
  }
);
const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.groupManagerSourceEmpty.title',
  {
    defaultMessage: 'Whoops!',
  }
);
const EMPTY_STATE_BODY = i18n.translate(
  'xpack.enterpriseSearch.workplaceSearch.groups.groupManagerSourceEmpty.body',
  {
    defaultMessage: 'Looks like you have not added any shared content sources yet.',
  }
);

interface GroupManagerModalProps {
  children: React.ReactElement;
  label: string;
  allItems: object[];
  numSelected: number;
  hideModal(group: Group): void;
  selectAll(allItems: object[]): void;
  saveItems(): void;
}

export const GroupManagerModal: React.FC<GroupManagerModalProps> = ({
  children,
  label,
  allItems,
  numSelected,
  hideModal,
  selectAll,
  saveItems,
}) => {
  const { group, managerModalFormErrors } = useValues(GroupLogic);
  const { contentSources } = useValues(GroupsLogic);

  const allSelected = numSelected === allItems.length;
  const isSources = label === 'shared content sources';
  const showEmptyState = isSources && contentSources.length < 1;
  const handleClose = () => hideModal(group);
  const handleSelectAll = () => selectAll(allSelected ? [] : allItems);

  const sourcesButton = (
    <EuiButtonTo to={SOURCES_PATH} fill color="primary">
      {ADD_SOURCE_BUTTON_TEXT}
    </EuiButtonTo>
  );

  const emptyState = (
    <EuiModalBody>
      <EuiSpacer size="m" />
      <EuiEmptyPrompt
        iconType={noSharedSourcesIcon}
        title={<h3>{EMPTY_STATE_TITLE}</h3>}
        body={EMPTY_STATE_BODY}
        actions={sourcesButton}
      />
    </EuiModalBody>
  );

  const modalContent = (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.enterpriseSearch.workplaceSearch.groups.groupManagerHeaderTitle', {
            defaultMessage: 'Manage {label}',
            values: { label },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFormRow
              error={managerModalFormErrors}
              isInvalid={managerModalFormErrors.length > 0}
              fullWidth
            >
              {children}
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="SelectAllGroups" onClick={handleSelectAll}>
              {i18n.translate(
                'xpack.enterpriseSearch.workplaceSearch.groups.groupManagerSelectAllToggle',
                {
                  defaultMessage: '{action} All',
                  values: { action: allSelected ? 'Deselect' : 'Select' },
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty data-test-subj="CloseGroupsModal" onClick={handleClose}>
                  {CANCEL_BUTTON}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton isDisabled={false} onClick={saveItems} fill>
                  {UPDATE_BUTTON}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );

  return (
    <EuiModal
      onClose={handleClose}
      initialFocus=".euiFieldSearch"
      data-test-subj="GroupManagerModal"
    >
      {showEmptyState ? emptyState : modalContent}
    </EuiModal>
  );
};
