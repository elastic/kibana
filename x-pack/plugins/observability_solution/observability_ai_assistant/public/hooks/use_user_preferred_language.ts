/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import {
  DEFAULT_LANGUAGE_OPTION,
  KIBANA_LOCALE_SETTING,
  BROWSER_LANGUAGE_SETTING,
  languages,
} from '../../common/ui_settings/language_options';
import { aiAssistantResponseLanguage } from '../../common';

import { useKibana } from './use_kibana';

export type UseUserPreferredLanguageResult = ReturnType<typeof useUserPreferredLanguage>;

export function useUserPreferredLanguage() {
  const {
    services: { uiSettings },
  } = useKibana();

  const selectedLanguage = uiSettings.get<string>(
    aiAssistantResponseLanguage,
    DEFAULT_LANGUAGE_OPTION.value
  );

  const getPreferredLanguage = useCallback(() => {
    if (selectedLanguage === KIBANA_LOCALE_SETTING.value) {
      return getLanguageFromKibanaSettings();
    } else if (selectedLanguage === BROWSER_LANGUAGE_SETTING.value) {
      return getLanguageFromBrowserSetting();
    } else {
      return languages[selectedLanguage] || 'English';
    }
  }, [selectedLanguage]);

  return { selectedLanguage, getPreferredLanguage };
}

function getLanguageFromKibanaSettings() {
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

function getLanguageFromBrowserSetting() {
  return languages[navigator.language] || 'English';
}
