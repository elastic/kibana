/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCallback, useEffect, useRef } from 'react';
import type { AlertTags } from '../../../../../common/api/detection_engine';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import * as i18n from './translations';
import { setAlertTags } from '../../../containers/alert_tags/api';

export type SetAlertTagsFunc = (
  tags: AlertTags,
  ids: string[],
  onSuccess: () => void,
  setTableLoading: (param: boolean) => void
) => Promise<void>;
export type ReturnSetAlertTags = SetAlertTagsFunc | null;

/**
 * Update alert tags by query
 *
 * @param tags to add and/or remove from a batch of alerts
 * @param ids alert ids that will be used to create the update query.
 * @param onSuccess a callback function that will be called on successful api response
 * @param setTableLoading a function that sets the alert table in a loading state for bulk actions

 *
 * @throws An error if response is not OK
 */
export const useSetAlertTags = (): ReturnSetAlertTags => {
  const { http } = useKibana<CoreStart>().services;
  const { addSuccess, addError } = useAppToasts();
  const setAlertTagsRef = useRef<SetAlertTagsFunc | null>(null);

  const onUpdateSuccess = useCallback(
    (updated: number = 0) => addSuccess(i18n.UPDATE_ALERT_TAGS_SUCCESS_TOAST(updated)),
    [addSuccess]
  );

  const onUpdateFailure = useCallback(
    (error: Error) => {
      addError(error.message, { title: i18n.UPDATE_ALERT_TAGS_FAILURE });
    },
    [addError]
  );

  useEffect(() => {
    let ignore = false;
    const abortCtrl = new AbortController();

    const onSetAlertTags: SetAlertTagsFunc = async (tags, ids, onSuccess, setTableLoading) => {
      try {
        setTableLoading(true);
        const response = await setAlertTags({ tags, ids, signal: abortCtrl.signal });
        if (!ignore) {
          onSuccess();
          setTableLoading(false);
          onUpdateSuccess(response.updated);
        }
      } catch (error) {
        if (!ignore) {
          setTableLoading(false);
          onUpdateFailure(error);
        }
      }
    };

    setAlertTagsRef.current = onSetAlertTags;
    return (): void => {
      ignore = true;
      abortCtrl.abort();
    };
  }, [http, onUpdateFailure, onUpdateSuccess]);

  return setAlertTagsRef.current;
};
