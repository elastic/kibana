/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  DEFAULT_MAX_RESULT_WINDOW,
  DEFAULT_MAX_INNER_RESULT_WINDOW,
  INDEX_SETTINGS_API_PATH,
} from '../../../../../common/constants';
import { getHttp, getToasts } from '../../../../kibana_services';

let toastDisplayed = false;
const indexSettings = new Map<string, Promise<INDEX_SETTINGS>>();

export interface INDEX_SETTINGS {
  maxResultWindow: number;
  maxInnerResultWindow: number;
}

export async function loadIndexSettings(indexPatternTitle: string): Promise<INDEX_SETTINGS> {
  if (indexSettings.has(indexPatternTitle)) {
    return indexSettings.get(indexPatternTitle)!;
  }

  const fetchPromise = fetchIndexSettings(indexPatternTitle);
  indexSettings.set(indexPatternTitle, fetchPromise);
  return fetchPromise;
}

async function fetchIndexSettings(indexPatternTitle: string): Promise<INDEX_SETTINGS> {
  const http = getHttp();
  const toasts = getToasts();
  try {
    return await http.fetch(`/${INDEX_SETTINGS_API_PATH}`, {
      method: 'GET',
      credentials: 'same-origin',
      query: {
        indexPatternTitle,
      },
    });
  } catch (err) {
    const warningMsg = i18n.translate('xpack.maps.indexSettings.fetchErrorMsg', {
      defaultMessage: `Unable to fetch index settings for data view '{indexPatternTitle}'.
      Ensure you have '{viewIndexMetaRole}' role.`,
      values: {
        indexPatternTitle,
        viewIndexMetaRole: 'view_index_metadata',
      },
    });
    if (!toastDisplayed) {
      // Only show toast for first failure to avoid flooding user with warnings
      toastDisplayed = true;
      toasts.addWarning(warningMsg);
    }
    // eslint-disable-next-line no-console
    console.warn(warningMsg);
    return {
      maxResultWindow: DEFAULT_MAX_RESULT_WINDOW,
      maxInnerResultWindow: DEFAULT_MAX_INNER_RESULT_WINDOW,
    };
  }
}
