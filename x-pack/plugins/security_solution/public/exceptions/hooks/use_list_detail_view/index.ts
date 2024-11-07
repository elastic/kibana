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
import type { ExceptionListSchema, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';
import { isEqual } from 'lodash';
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
import { useInvalidateFetchRuleByIdQuery } from '../../../detection_engine/rule_management/api/hooks/use_fetch_rule_by_id_query';

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

export const useListDetailsView = (exceptionListId: string) => {
  const toasts = useToasts();
  const { services } = useKibana();
  const { http, notifications } = services;
  const { navigateToApp } = services.application;

  const { exportExceptionList, deleteExceptionList, duplicateExceptionList } = useApi(http);

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
  const [disableManageButton, setDisableManageButton] = useState(true);
  const [refreshExceptions, setRefreshExceptions] = useState(false);
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();

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
    (
      error: Error,
      newViewerStatue?: ViewerStatus,
      errorTitle?: string,
      errorDescription?: string
    ) => {
      toasts?.addError(error, {
        title: errorTitle ?? '',
        toastMessage: errorDescription ?? '',
      });
      setViewerStatus(newViewerStatue ?? '');
    },
    [toasts]
  );

  const initializeListRules = useCallback(
    async (result: Awaited<ReturnType<typeof getListById>>) => {
      if (result) {
        const listRules = await getListRules(result.list_id);
        setLinkedRules(listRules);
      }
    },
    []
  );

  const initializeList = useCallback(async () => {
    try {
      if (ALL_ENDPOINT_ARTIFACT_LIST_IDS.includes(exceptionListId)) return setInvalidListId(true);
      setIsLoading(true);

      const result = await getListById({
        id: exceptionListId,
        http,
      });
      if (!result || !isAnExceptionListItem(result)) {
        setIsLoading(false);
        return setInvalidListId(true);
      }

      setList(result);
      await initializeListRules(result);
      setIsLoading(false);
      setInvalidListId(false);
      if (checkIfListCannotBeEdited(result)) return setCanUserEditList(false);
    } catch (error) {
      handleErrorStatus(
        error,
        ViewerStatus.ERROR,
        i18n.EXCEPTION_ERROR_TITLE,
        i18n.EXCEPTION_ERROR_DESCRIPTION
      );
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
              description: listDetails.description ?? '',
              namespace_type: list.namespace_type,
            },
          });
      } catch (error) {
        handleErrorStatus(error);
      }
    },
    [exceptionListId, handleErrorStatus, http, list]
  );
  const onExportList = useCallback(
    async (includeExpiredExceptions: boolean) => {
      try {
        if (!list) return;
        await exportExceptionList({
          id: list.id,
          listId: list.list_id,
          includeExpiredExceptions,
          namespaceType: list.namespace_type,
          onError: (error: Error) => handleErrorStatus(error),
          onSuccess: (blob) => {
            setExportedList(blob);
            toasts?.addSuccess(i18n.EXCEPTION_LIST_EXPORTED_SUCCESSFULLY(list.name));
          },
        });
      } catch (error) {
        handleErrorStatus(
          error,
          undefined,
          i18n.EXCEPTION_EXPORT_ERROR,
          i18n.EXCEPTION_EXPORT_ERROR_DESCRIPTION
        );
      }
    },
    [list, exportExceptionList, handleErrorStatus, toasts]
  );

  const onDuplicateList = useCallback(
    async (includeExpiredExceptions: boolean) => {
      try {
        if (!list) return;
        await duplicateExceptionList({
          listId: list.list_id,
          includeExpiredExceptions,
          namespaceType: list.namespace_type,
          onError: (error: Error) => handleErrorStatus(error),
          onSuccess: (newList: ExceptionListSchema) => {
            toasts?.addSuccess(i18n.EXCEPTION_LIST_DUPLICATED_SUCCESSFULLY(list.name));
            navigateToApp(APP_UI_ID, {
              deepLinkId: SecurityPageName.exceptions,
              path: `/details/${newList.list_id}`,
            });
          },
        });
      } catch (error) {
        handleErrorStatus(
          error,
          undefined,
          i18n.EXCEPTION_DUPLICATE_ERROR,
          i18n.EXCEPTION_DUPLICATE_ERROR_DESCRIPTION
        );
      }
    },
    [list, duplicateExceptionList, handleErrorStatus, toasts, navigateToApp]
  );

  const handleOnDownload = useCallback(() => {
    setExportedList(undefined);
  }, []);

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

  const resetManageRulesAfterSaving = useCallback(() => {
    setLinkedRules(newLinkedRules);
    setNewLinkedRules(newLinkedRules);
    setShowManageRulesFlyout(false);
    setShowManageButtonLoader(false);
    setDisableManageButton(true);
  }, [newLinkedRules]);
  const onManageRules = useCallback(() => {
    setShowManageRulesFlyout(true);
  }, []);

  const getRulesToAdd = useCallback(() => {
    return newLinkedRules.filter((rule) => !linkedRules.includes(rule));
  }, [linkedRules, newLinkedRules]);

  const getRulesToRemove = useCallback(() => {
    return linkedRules.filter((rule) => !newLinkedRules.includes(rule));
  }, [linkedRules, newLinkedRules]);

  const onRuleSelectionChange = useCallback((value: UIRule[]) => {
    setNewLinkedRules(value);
    setDisableManageButton(false);
  }, []);

  const onSaveManageRules = useCallback(async () => {
    try {
      if (!list) return setShowManageRulesFlyout(false);

      setShowManageButtonLoader(true);
      const rulesToAdd = getRulesToAdd();
      const rulesToRemove = getRulesToRemove();

      if ((!rulesToAdd.length && !rulesToRemove.length) || isEqual(rulesToAdd, rulesToRemove))
        return resetManageRulesAfterSaving();

      Promise.all([
        unlinkListFromRules({ rules: rulesToRemove, listId: exceptionListId }),
        linkListToRules({
          rules: rulesToAdd,
          listId: exceptionListId,
          id: list.id,
          listType: list.type,
          listNamespaceType: list.namespace_type,
        }),
      ])
        .then(() => {
          setRefreshExceptions(true);
          resetManageRulesAfterSaving();
        })
        .then(() => setRefreshExceptions(false))
        .then(() => invalidateFetchRuleByIdQuery())
        .catch((error) => {
          handleErrorStatus(
            error,
            undefined,
            i18n.EXCEPTION_MANAGE_RULES_ERROR,
            i18n.EXCEPTION_MANAGE_RULES_ERROR_DESCRIPTION
          );
          setShowManageButtonLoader(false);
        })
        .finally(() => {
          initializeList();
        });
    } catch (err) {
      handleErrorStatus(err);
    }
  }, [
    list,
    getRulesToAdd,
    getRulesToRemove,
    resetManageRulesAfterSaving,
    exceptionListId,
    invalidateFetchRuleByIdQuery,
    handleErrorStatus,
    initializeList,
  ]);
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
    handleOnDownload,
    viewerStatus,
    showManageRulesFlyout,
    headerBackOptions,
    referenceModalState,
    showReferenceErrorModal,
    showManageButtonLoader,
    refreshExceptions,
    disableManageButton,
    handleDelete,
    onDuplicateList,
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
