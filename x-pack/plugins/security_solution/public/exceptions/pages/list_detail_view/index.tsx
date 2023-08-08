/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';

import {
  EmptyViewerState,
  ExceptionListHeader,
  ViewerStatus,
} from '@kbn/securitysolution-exception-list-components';
import { EuiSkeletonText } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
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
import type { CheckExceptionTtlActionTypes } from '../../components/expired_exceptions_list_items_modal';
import { IncludeExpiredExceptionsModal } from '../../components/expired_exceptions_list_items_modal';

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
    handleOnDownload,
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
    onDuplicateList,
    onExportList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
    handleDelete,
    handleCloseReferenceErrorModal,
    handleReferenceDelete,
  } = useListDetailsView(exceptionListId);

  const [showIncludeExpiredExceptionItemsModal, setShowIncludeExpiredExceptionItemsModal] =
    useState<CheckExceptionTtlActionTypes | null>(null);

  const onModalClose = useCallback(
    () => setShowIncludeExpiredExceptionItemsModal(null),
    [setShowIncludeExpiredExceptionItemsModal]
  );

  const onModalOpen = useCallback(
    (actionType: CheckExceptionTtlActionTypes) => {
      setShowIncludeExpiredExceptionItemsModal(actionType);
    },
    [setShowIncludeExpiredExceptionItemsModal]
  );

  const handleExportList = useCallback(() => {
    if (list?.type === ExceptionListTypeEnum.ENDPOINT) {
      onExportList(true);
    } else {
      onModalOpen('export');
    }
  }, [onModalOpen, list, onExportList]);

  const handleDuplicateList = useCallback(() => {
    onModalOpen('duplicate');
  }, [onModalOpen]);

  const detailsViewContent = useMemo(() => {
    if (viewerStatus === ViewerStatus.ERROR)
      return <EmptyViewerState isReadOnly={isReadOnly} viewerStatus={viewerStatus} />;

    if (isLoading) return <EuiSkeletonText lines={4} data-test-subj="loading" />;

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
          onExportList={handleExportList}
          onDeleteList={handleDelete}
          onManageRules={onManageRules}
          onDuplicateList={handleDuplicateList}
          dataTestSubj="exceptionListManagement"
        />

        <AutoDownload blob={exportedList} name={`${listId}.ndjson`} onDownload={handleOnDownload} />
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
        {showIncludeExpiredExceptionItemsModal && (
          <IncludeExpiredExceptionsModal
            onModalConfirm={
              showIncludeExpiredExceptionItemsModal === 'export' ? onExportList : onDuplicateList
            }
            handleCloseModal={onModalClose}
            action={showIncludeExpiredExceptionItemsModal}
          />
        )}
      </>
    );
  }, [
    viewerStatus,
    isReadOnly,
    isLoading,
    invalidListId,
    listName,
    list,
    listDescription,
    listId,
    linkedRules,
    canUserEditList,
    headerBackOptions,
    onEditListDetails,
    handleExportList,
    handleDelete,
    onManageRules,
    handleDuplicateList,
    exportedList,
    handleOnDownload,
    refreshExceptions,
    referenceModalState.contentText,
    referenceModalState.rulesReferences,
    handleCloseReferenceErrorModal,
    handleReferenceDelete,
    showReferenceErrorModal,
    showManageRulesFlyout,
    showManageButtonLoader,
    disableManageButton,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
    showIncludeExpiredExceptionItemsModal,
    onExportList,
    onDuplicateList,
    onModalClose,
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
