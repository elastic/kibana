/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  BackOptions,
  ListDetails,
  Rule as UIRule,
} from '@kbn/securitysolution-exception-list-components';
import { ViewerStatus } from '@kbn/securitysolution-exception-list-components';
import { useParams } from 'react-router-dom';
import type { ExceptionListSchema, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';
import { useUserData } from '../../../detections/components/user_info';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import {
  updateList,
  getListRules,
  getListById,
  unlinkListFromRules,
  linkListToRules,
} from '../../api';
import { checkIfListCannotBeEdited, isAnExceptionListItem } from '../../utils/list.utils';
import * as i18n from '../../translations';

interface ReferenceModalState {
  contentText: string;
  rulesReferences: string[];
  isLoading: boolean;
  listId: string;
  listNamespaceType: NamespaceType;
}

const exceptionReferenceModalInitialState: ReferenceModalState = {
  contentText: '',
  rulesReferences: [],
  isLoading: false,
  listId: '',
  listNamespaceType: 'single',
};

export const useExceptionListDetails = () => {
  const toasts = useToasts();
  const { services } = useKibana();
  const { http, notifications } = services;
  const { navigateToApp } = services.application;

  const { exportExceptionList, deleteExceptionList } = useApi(http);

  const { exceptionListId } = useParams<{
    exceptionListId: string;
  }>();

  const [{ loading: userInfoLoading, canUserCRUD, canUserREAD }] = useUserData();

  const [isLoading, setIsLoading] = useState<boolean>();
  const [showManageButtonLoader, setShowManageButtonLoader] = useState<boolean>(false);
  const [list, setList] = useState<ExceptionListSchema | null>();
  const [invalidListId, setInvalidListId] = useState(false);
  const [linkedRules, setLinkedRules] = useState<UIRule[]>([]);
  const [newLinkedRules, setNewLinkedRules] = useState<UIRule[]>([]);
  const [canUserEditList, setCanUserEditList] = useState(true);
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus | string>('');
  const [exportedList, setExportedList] = useState<Blob>();
  const [showReferenceErrorModal, setShowReferenceErrorModal] = useState(false);
  const [referenceModalState, setReferenceModalState] = useState<ReferenceModalState>(
    exceptionReferenceModalInitialState
  );

  const headerBackOptions: BackOptions = useMemo(
    () => ({
      pageId: SecurityPageName.exceptions,
      path: '',
      onNavigate: () => {
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.exceptions,
          path: '',
        });
      },
    }),
    [navigateToApp]
  );

  const handleErrorStatus = useCallback(
    (error: Error, errorTitle?: string, errorDescription?: string) => {
      toasts?.addError(error, {
        title: errorTitle || i18n.EXCEPTION_ERROR_TITLE,
        toastMessage: errorDescription || i18n.EXCEPTION_ERROR_DESCRIPTION,
      });
      setViewerStatus(ViewerStatus.ERROR);
    },
    [toasts]
  );

  const initializeListRules = useCallback(async (result) => {
    const listRules = await getListRules(result.list_id);
    setLinkedRules(listRules);
  }, []);

  const initializeList = useCallback(async () => {
    try {
      if (ALL_ENDPOINT_ARTIFACT_LIST_IDS.includes(exceptionListId)) return setInvalidListId(true);
      setIsLoading(true);

      const result = await getListById({
        id: exceptionListId,
        http,
      });
      if (!result || !isAnExceptionListItem(result)) return setInvalidListId(true);

      setList(result);
      await initializeListRules(result);
      setIsLoading(false);
      setInvalidListId(false);
      if (checkIfListCannotBeEdited(result)) return setCanUserEditList(false);
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [exceptionListId, http, initializeListRules, handleErrorStatus]);

  useEffect(() => {
    initializeList();
  }, [initializeList]);

  const [showManageRulesFlyout, setShowManageRulesFlyout] = useState(false);

  const onEditListDetails = useCallback(
    async (listDetails: ListDetails) => {
      try {
        if (list)
          await updateList({
            http,
            list: {
              id: list.id,
              list_id: exceptionListId,
              type: list.type,
              name: listDetails.name,
              description: listDetails.description || list.description,
            },
          });
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [exceptionListId, handleErrorStatus, http, list]
  );
  const onExportList = useCallback(async () => {
    try {
      if (!list) return;
      await exportExceptionList({
        id: list.id,
        listId: list.list_id,
        namespaceType: list.namespace_type,
        onError: (error: Error) => handleErrorStatus(error),
        onSuccess: (blob) => {
          setExportedList(blob);
          toasts?.addSuccess(i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(list.list_id));
        },
      });
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [list, exportExceptionList, handleErrorStatus, toasts]);

  // #region DeleteList

  const handleDeleteSuccess = useCallback(
    (listId?: string) => () => {
      notifications.toasts.addSuccess({
        title: i18n.exceptionDeleteSuccessMessage(listId ?? referenceModalState.listId),
      });
    },
    [notifications.toasts, referenceModalState.listId]
  );

  const handleDeleteError = useCallback(
    (err: Error & { body?: { message: string } }): void => {
      handleErrorStatus(err);
    },
    [handleErrorStatus]
  );
  const onDeleteList = useCallback(async () => {
    try {
      if (!list) return;

      await deleteExceptionList({
        id: list.id,
        namespaceType: list.namespace_type,
        onError: handleDeleteError,
        onSuccess: handleDeleteSuccess,
      });
    } catch (error) {
      handleErrorStatus(error);
    } finally {
      setReferenceModalState(exceptionReferenceModalInitialState);
      setShowReferenceErrorModal(false);
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.exceptions,
        path: '',
      });
    }
  }, [
    list,
    deleteExceptionList,
    handleDeleteError,
    handleDeleteSuccess,
    handleErrorStatus,
    navigateToApp,
  ]);

  const handleDelete = useCallback(() => {
    try {
      if (!list) return;
      setReferenceModalState({
        contentText: linkedRules.length
          ? i18n.referenceErrorMessage(linkedRules.length)
          : i18n.defaultDeleteListMessage(list.name),
        rulesReferences: linkedRules.map(({ name }) => name),
        isLoading: true,
        listId: list.list_id,
        listNamespaceType: list.namespace_type,
      });
      setShowReferenceErrorModal(true);
    } catch (error) {
      handleErrorStatus(error);
    }
  }, [handleErrorStatus, linkedRules, list]);

  const handleCloseReferenceErrorModal = useCallback((): void => {
    setShowReferenceErrorModal(false);
    setReferenceModalState({
      contentText: '',
      rulesReferences: [],
      isLoading: false,
      listId: '',
      listNamespaceType: 'single',
    });
  }, []);
  const handleReferenceDelete = useCallback(async (): Promise<void> => {
    try {
      await unlinkListFromRules({ rules: linkedRules, listId: exceptionListId });
      onDeleteList();
    } catch (err) {
      handleErrorStatus(err);
    }
  }, [exceptionListId, linkedRules, handleErrorStatus, onDeleteList]);

  // #endregion

  // #region Manage Rules

  const onManageRules = useCallback(() => {
    setShowManageRulesFlyout(true);
  }, []);

  const getRulesToAdd = useCallback(() => {
    return newLinkedRules.filter((rule) => !linkedRules.includes(rule));
  }, [linkedRules, newLinkedRules]);

  const getRulesToRemove = useCallback(() => {
    return linkedRules.filter((rule) => !newLinkedRules.includes(rule));
  }, [linkedRules, newLinkedRules]);

  const onRuleSelectionChange = useCallback((value) => {
    setNewLinkedRules(value);
  }, []);

  const onSaveManageRules = useCallback(async () => {
    setShowManageButtonLoader(true);
    try {
      if (!list) return;
      const rulesToAdd = getRulesToAdd();
      const rulesToRemove = getRulesToRemove();
      if (!rulesToAdd.length && !rulesToRemove.length) return;

      await Promise.all([
        unlinkListFromRules({ rules: rulesToRemove, listId: exceptionListId }),
        linkListToRules({
          rules: rulesToAdd,
          listId: exceptionListId,
          id: list.id,
          listType: list.type,
          listNamespaceType: list.namespace_type,
        }),
      ]);
      setShowManageButtonLoader(false);
      setNewLinkedRules([]);
      setLinkedRules(newLinkedRules);
      setShowManageRulesFlyout(false);
    } catch (err) {
      handleErrorStatus(err);
    }
  }, [list, getRulesToAdd, getRulesToRemove, exceptionListId, newLinkedRules, handleErrorStatus]);
  const onCancelManageRules = useCallback(() => {
    setShowManageRulesFlyout(false);
  }, []);

  // #endregion

  return {
    isLoading: isLoading || userInfoLoading,
    invalidListId,
    isReadOnly: !!(!canUserCRUD && canUserREAD),
    list,
    listName: list?.name,
    listDescription: list?.description,
    listId: exceptionListId,
    canUserEditList,
    linkedRules,
    exportedList,
    viewerStatus,
    showManageRulesFlyout,
    headerBackOptions,
    referenceModalState,
    showReferenceErrorModal,
    showManageButtonLoader,
    handleDelete,
    onEditListDetails,
    onExportList,
    onDeleteList,
    onManageRules,
    onSaveManageRules,
    onCancelManageRules,
    onRuleSelectionChange,
    handleCloseReferenceErrorModal,
    handleReferenceDelete,
  };
};
