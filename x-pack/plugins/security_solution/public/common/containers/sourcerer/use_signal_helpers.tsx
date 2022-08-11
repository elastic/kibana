/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { sourcererSelectors } from '../../store';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { useSourcererDataView } from '.';
import { SourcererScopeName } from '../../store/sourcerer/model';
import { postSourcererDataView } from './api';
import { sourcererActions } from '../../store/sourcerer';
import { useDataView } from '../source/use_data_view';
import { useAppToasts } from '../../hooks/use_app_toasts';

export const useSignalHelpers = (): {
  /* when defined, signal index has been initiated but does not exist */
  pollForSignalIndex?: () => void;
  /* when false, signal index has been initiated */
  signalIndexNeedsInit: boolean;
} => {
  const { indicesExist } = useSourcererDataView(SourcererScopeName.detections);
  const { indexFieldsSearch } = useDataView();
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  const abortCtrl = useRef(new AbortController());

  const getDefaultDataViewSelector = useMemo(
    () => sourcererSelectors.defaultDataViewSelector(),
    []
  );
  const getSignalIndexNameSelector = useMemo(
    () => sourcererSelectors.signalIndexNameSelector(),
    []
  );
  const signalIndexNameSourcerer = useDeepEqualSelector(getSignalIndexNameSelector);
  const defaultDataView = useDeepEqualSelector(getDefaultDataViewSelector);

  const signalIndexNeedsInit = useMemo(
    () => !defaultDataView.title.includes(`${signalIndexNameSourcerer}`),
    [defaultDataView.title, signalIndexNameSourcerer]
  );
  const shouldWePollForIndex = useMemo(
    () => !indicesExist && !signalIndexNeedsInit,
    [indicesExist, signalIndexNeedsInit]
  );

  const pollForSignalIndex = useCallback(() => {
    const asyncSearch = async () => {
      abortCtrl.current = new AbortController();
      try {
        const response = await postSourcererDataView({
          body: { patternList: defaultDataView.title.split(',') },
          signal: abortCtrl.current.signal,
        });

        if (
          signalIndexNameSourcerer !== null &&
          response.defaultDataView.patternList.includes(signalIndexNameSourcerer)
        ) {
          // first time signals is defined and validated in the sourcerer
          // redo indexFieldsSearch
          indexFieldsSearch({ dataViewId: response.defaultDataView.id });
          dispatch(sourcererActions.setSourcererDataViews(response));
        }
      } catch (err) {
        addError(err, {
          title: i18n.translate('xpack.securitySolution.sourcerer.error.title', {
            defaultMessage: 'Error updating Security Data View',
          }),
          toastMessage: i18n.translate('xpack.securitySolution.sourcerer.error.toastMessage', {
            defaultMessage: 'Refresh the page',
          }),
        });
      }
    };

    if (signalIndexNameSourcerer !== null) {
      abortCtrl.current.abort();
      asyncSearch();
    }
  }, [addError, defaultDataView.title, dispatch, indexFieldsSearch, signalIndexNameSourcerer]);

  return {
    ...(shouldWePollForIndex ? { pollForSignalIndex } : {}),
    signalIndexNeedsInit,
  };
};
