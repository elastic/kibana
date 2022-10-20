/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FC } from 'react';

import {
  EmptyViewerState,
  ExceptionListHeader,
  ViewerStatus,
} from '@kbn/securitysolution-exception-list-components';

import { AutoDownload } from '../../../../common/components/auto_download/auto_download';
import { ListWithSearch } from './list_with_search';
import { useManageExceptionListDetails } from './hooks/use_manage_exception_list_details';
import type { ExceptionListDetailsComponentProps } from './types';
import { ListDetailsLinkAnchor } from '../../components/list_details_link_anchor';
import { ManageRules } from './manage_rules';

export const ExceptionListDetailsComponent: FC<ExceptionListDetailsComponentProps> = ({
  isReadOnly = false,
  list,
}) => {
  const {
    allRules,
    listId,
    linkedRules,
    exportedList,
    viewerStatus,
    listName,
    listDescription,
    showManageRulesFlyout,
    onEditListDetails,
    onExportList,
    onDeleteList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
  } = useManageExceptionListDetails({ isReadOnly, list });
  return (
    <>
      <ExceptionListHeader
        name={listName}
        description={listDescription}
        listId={listId}
        linkedRules={linkedRules}
        isReadonly={false}
        securityLinkAnchorComponent={ListDetailsLinkAnchor}
        onEditListDetails={onEditListDetails}
        onExportList={onExportList}
        onDeleteList={onDeleteList}
        onManageRules={onManageRules}
      />
      {viewerStatus === ViewerStatus.ERROR ? (
        <EmptyViewerState isReadOnly={isReadOnly} viewerStatus={viewerStatus} />
      ) : (
        <>
          <AutoDownload blob={exportedList} name={listName} />
          <ListWithSearch list={list} />
          {showManageRulesFlyout ? (
            <ManageRules
              linkedRules={allRules}
              onSave={onSaveManageRules}
              onCancel={onCancelManageRules}
              onRuleSelectionChange={onRuleSelectionChange}
            />
          ) : null}
        </>
      )}
    </>
  );
};

ExceptionListDetailsComponent.displayName = 'ExceptionListDetailsComponent';
