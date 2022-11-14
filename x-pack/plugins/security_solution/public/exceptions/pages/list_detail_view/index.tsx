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
import { EuiLoadingContent } from '@elastic/eui';
import type { Rule } from '../../../detection_engine/rule_management/logic/types';
import { MissingPrivilegesCallOut } from '../../../detections/components/callouts/missing_privileges_callout';
import { NotFoundPage } from '../../../app/404';
import { AutoDownload } from '../../../common/components/auto_download/auto_download';
import { ListWithSearch, ManageRules, ListDetailsLinkAnchor } from '../../components';
import { useExceptionListDetails } from '../../hooks';

export const ListsDetailViewComponent: FC = () => {
  const {
    isLoading,
    invalidListId,
    isReadOnly,
    list,
    canUserEditList,
    listId,
    linkedRules,
    exportedList,
    viewerStatus,
    listName,
    listDescription,
    showManageRulesFlyout,
    headerBackOptions,
    onEditListDetails,
    onExportList,
    onDeleteList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
  } = useExceptionListDetails();

  if (isLoading) return <EuiLoadingContent lines={4} data-test-subj="loading" />;

  if (invalidListId || !listName || !listDescription || !list) return <NotFoundPage />;

  return (
    <>
      <MissingPrivilegesCallOut />
      <ExceptionListHeader
        name={listName}
        description={listDescription}
        listId={listId}
        linkedRules={linkedRules}
        isReadonly={isReadOnly}
        canUserEditList={canUserEditList}
        backOptions={headerBackOptions}
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
          <AutoDownload blob={exportedList} name={listId} />
          <ListWithSearch list={list} isReadOnly={isReadOnly} />
          {showManageRulesFlyout ? (
            <ManageRules
              linkedRules={linkedRules as Rule[]}
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

ListsDetailViewComponent.displayName = 'ListsDetailViewComponent';
export const ListsDetailView = React.memo(ListsDetailViewComponent);
ListsDetailView.displayName = 'ListsDetailView';
