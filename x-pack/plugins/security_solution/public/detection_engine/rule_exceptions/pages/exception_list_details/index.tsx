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
import { ListDetailsLinkAnchor } from '../../components/list_details_link_anchor';
import { ListWithSearch, ManageRules } from './components';
import { useExceptionListDetails } from './use_exception_list_details';
import type { ExceptionListDetailsComponentProps } from './types';

export const ExceptionListDetailsComponent: FC<ExceptionListDetailsComponentProps> = ({
  isReadOnly = false,
  list,
}) => {
  const {
    canUserEditList,
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
  } = useExceptionListDetails({ isReadOnly, list });
  return (
    <>
      <ExceptionListHeader
        name={listName}
        description={listDescription}
        listId={listId}
        linkedRules={linkedRules}
        isReadonly={isReadOnly}
        canUserEditList={canUserEditList}
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
          <ListWithSearch list={list} isReadOnly={isReadOnly} />
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
export const ExceptionListDetails = React.memo(ExceptionListDetailsComponent);
ExceptionListDetails.displayName = 'ExceptionListDetails';
