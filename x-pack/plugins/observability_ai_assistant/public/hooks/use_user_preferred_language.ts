/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export type UseUserPreferredLanguageResult = ReturnType<typeof useUserPreferredLanguage>;

export const SELECTED_LANGUAGE_LOCAL_STORAGE_KEY =
  'xpack.observabilityAiAssistant.responseLanguage';

export function useUserPreferredLanguage() {
  const [selectedLanguage, selectLanguage] = useLocalStorage(
    SELECTED_LANGUAGE_LOCAL_STORAGE_KEY,
    getDefaultFromLocale()
  );

  return {
    selectedLanguage,
    selectLanguage,
  };
}

function getDefaultFromLocale() {
  switch (i18n.getLocale()) {
    case 'en':
      return 'English';
    case 'zh-cn':
      return '简体中文';
    case 'ja-jp':
      return '日本語';
    case 'fr-fr':
      return 'français';
    default:
      return 'English';
  }
}
