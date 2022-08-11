/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../../lib/kibana';
import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { ensurePatternFormat } from '../../store/sourcerer/helpers';
import * as i18n from './translations';
import { RefreshButton } from './refresh_button';
import { useAppToasts } from '../../hooks/use_app_toasts';

export const useUpdateDataView = (
  onOpenAndReset: () => void
): ((missingPatterns: string[]) => Promise<boolean>) => {
  const { theme, uiSettings } = useKibana().services;
  const { addSuccess, addError } = useAppToasts();
  return useCallback(
    async (missingPatterns: string[]): Promise<boolean> => {
      const asyncSearch = async (): Promise<[boolean, Error | null]> => {
        try {
          const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);
          const uiSettingsIndexPattern = [...defaultPatterns, ...missingPatterns];
          const isSuccess = await uiSettings.set(
            DEFAULT_INDEX_KEY,
            ensurePatternFormat(uiSettingsIndexPattern)
          );
          return [isSuccess, null];
        } catch (e) {
          return [false, e];
        }
      };
      const [isUiSettingsSuccess, possibleError] = await asyncSearch();
      if (isUiSettingsSuccess) {
        addSuccess({
          color: 'success',
          title: toMountPoint(i18n.SUCCESS_TOAST_TITLE, { theme$: theme.theme$ }),
          text: toMountPoint(<RefreshButton />, { theme$: theme.theme$ }),
          iconType: undefined,
          toastLifeTimeMs: 600000,
        });
        return true;
      }
      addError(possibleError !== null ? possibleError : new Error(i18n.FAILURE_TOAST_TITLE), {
        title: i18n.FAILURE_TOAST_TITLE,
        toastMessage: (
          <>
            <FormattedMessage
              id="xpack.securitySolution.indexPatterns.failureToastText"
              defaultMessage="Unexpected error occurred on update. If you would like to modify your data, you can manually select a data view {link}."
              values={{
                link: (
                  <EuiLink onClick={onOpenAndReset} data-test-subj="failureToastLink">
                    {i18n.TOGGLE_TO_NEW_SOURCERER}
                  </EuiLink>
                ),
              }}
            />
          </>
        ) as unknown as string,
      });
      return false;
    },
    [addError, addSuccess, onOpenAndReset, theme.theme$, uiSettings]
  );
};
