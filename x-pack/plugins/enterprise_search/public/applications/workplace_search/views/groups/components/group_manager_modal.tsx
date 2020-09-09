/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useValues } from 'kea';
import { Link } from 'react-router-dom';

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
  EuiOverlayMask,
  EuiSpacer,
} from '@elastic/eui';

import { IObject } from 'shared/types';
import { IGroup } from 'workplace_search/types';
import { ORG_SOURCES_PATH } from 'workplace_search/utils/routePaths';

import noSharedSourcesIcon from 'workplace_search/components/assets/shareCircle.svg';

import { GroupLogic, IGroupValues } from '../GroupLogic';
import { GroupsLogic, IGroupsValues } from '../GroupsLogic';

interface IGroupManagerModalProps {
  children: React.ReactElement;
  label: string;
  allItems: IObject[];
  numSelected: number;
  hideModal(group: IGroup);
  selectAll(allItems: IObject[]);
  saveItems();
}

export const GroupManagerModal: React.FC<IGroupManagerModalProps> = ({
  children,
  label,
  allItems,
  numSelected,
  hideModal,
  selectAll,
  saveItems,
}) => {
  const { group, managerModalFormErrors } = useValues(GroupLogic) as IGroupValues;
  const { contentSources } = useValues(GroupsLogic) as IGroupsValues;

  const allSelected = numSelected === allItems.length;
  const isSources = label === 'shared content sources';
  const showEmptyState = isSources && contentSources.length < 1;
  const handleClose = () => hideModal(group);
  const handleSelectAll = () => selectAll(allSelected ? [] : allItems);

  const sourcesButton = (
    <Link to={ORG_SOURCES_PATH}>
      <EuiButton fill color="primary">
        Add a Shared Source
      </EuiButton>
    </Link>
  );

  const emptyState = (
    <EuiModalBody>
      <EuiSpacer size="m" />
      <EuiEmptyPrompt
        iconType={noSharedSourcesIcon}
        title={<h3>Whoops!</h3>}
        body="Looks like you have not added any shared content sources yet."
        actions={sourcesButton}
      />
    </EuiModalBody>
  );

  const modalContent = (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Manage {label}</EuiModalHeaderTitle>
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
            <EuiButtonEmpty onClick={handleSelectAll}>
              {allSelected ? 'Deselect' : 'Select'} All
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={handleClose}>Cancel</EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton disabled={false} onClick={saveItems} fill>
                  Update
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );

  return (
    <EuiOverlayMask>
      <EuiModal
        onClose={handleClose}
        initialFocus=".euiFieldSearch"
        data-test-subj="GroupManagerModal"
      >
        {showEmptyState ? emptyState : modalContent}
      </EuiModal>
    </EuiOverlayMask>
  );
};
