/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { FC } from 'react';

import {
  EmptyViewerState,
  ExceptionListHeader,
  ViewerStatus,
} from '@kbn/securitysolution-exception-list-components';
import { EuiLoadingContent } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { ReferenceErrorModal } from '../../../detections/components/value_lists_management_flyout/reference_error_modal';
import type { Rule } from '../../../detection_engine/rule_management/logic/types';
import { MissingPrivilegesCallOut } from '../../../detections/components/callouts/missing_privileges_callout';
import { NotFoundPage } from '../../../app/404';
import { AutoDownload } from '../../../common/components/auto_download/auto_download';
import { ListWithSearch, ManageRules, ListDetailsLinkAnchor } from '../../components';
import { useListDetailsView } from '../../hooks';
import * as i18n from '../../translations';

export const ListsDetailViewComponent: FC = () => {
  const { detailName: exceptionListId } = useParams<{
    detailName: string;
  }>();
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
    showReferenceErrorModal,
    referenceModalState,
    showManageButtonLoader,
    refreshExceptions,
    disableManageButton,
    onEditListDetails,
    onExportList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
    handleDelete,
    handleCloseReferenceErrorModal,
    handleReferenceDelete,
  } = useListDetailsView(exceptionListId);

  const detailsViewContent = useMemo(() => {
    if (viewerStatus === ViewerStatus.ERROR)
      return <EmptyViewerState isReadOnly={isReadOnly} viewerStatus={viewerStatus} />;

    if (isLoading) return <EuiLoadingContent lines={4} data-test-subj="loading" />;

    if (invalidListId || !listName || !list) return <NotFoundPage />;
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
          onDeleteList={handleDelete}
          onManageRules={onManageRules}
        />

        <AutoDownload blob={exportedList} name={listId} />
        <ListWithSearch list={list} refreshExceptions={refreshExceptions} isReadOnly={isReadOnly} />
        <ReferenceErrorModal
          cancelText={i18n.REFERENCE_MODAL_CANCEL_BUTTON}
          confirmText={i18n.REFERENCE_MODAL_CONFIRM_BUTTON}
          contentText={referenceModalState.contentText}
          onCancel={handleCloseReferenceErrorModal}
          onClose={handleCloseReferenceErrorModal}
          onConfirm={handleReferenceDelete}
          references={referenceModalState.rulesReferences}
          showModal={showReferenceErrorModal}
          titleText={i18n.REFERENCE_MODAL_TITLE}
        />
        {showManageRulesFlyout ? (
          <ManageRules
            linkedRules={linkedRules as Rule[]}
            showButtonLoader={showManageButtonLoader}
            saveIsDisabled={disableManageButton}
            onSave={onSaveManageRules}
            onCancel={onCancelManageRules}
            onRuleSelectionChange={onRuleSelectionChange}
          />
        ) : null}
      </>
    );
  }, [
    canUserEditList,
    disableManageButton,
    exportedList,
    headerBackOptions,
    invalidListId,
    isLoading,
    isReadOnly,
    linkedRules,
    list,
    listDescription,
    listId,
    listName,
    referenceModalState.contentText,
    referenceModalState.rulesReferences,
    refreshExceptions,
    showManageButtonLoader,
    showManageRulesFlyout,
    showReferenceErrorModal,
    viewerStatus,
    onCancelManageRules,
    onEditListDetails,
    onExportList,
    onManageRules,
    onRuleSelectionChange,
    onSaveManageRules,
    handleCloseReferenceErrorModal,
    handleDelete,
    handleReferenceDelete,
  ]);
  return (
    <>
      <SpyRoute pageName={SecurityPageName.exceptions} state={{ listName }} />
      {detailsViewContent}
    </>
  );
};

ListsDetailViewComponent.displayName = 'ListsDetailViewComponent';
export const ListsDetailView = React.memo(ListsDetailViewComponent);
ListsDetailView.displayName = 'ListsDetailView';
