/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useSecuritySolutionUserSettings } from '../../../common/user_settings/use_security_solution_user_settings';
import type { UserSettingScope } from '../../../common/user_settings/types';
import type { AlertsPageTemplate, AlertsPageTemplateMap } from './types';

const fakeTemplateData = {
  jkTemplate: {
    id: 'jkTemplate',
    label: 'JK Template',
  },
};

export const useTemplates = () => {
  const { getUserSetting, setUserSettings } = useSecuritySolutionUserSettings();
  const activeTemplateRef = useRef<string | undefined>();

  const detectionTemplates = getUserSetting('alertsPage', 'templates') as
    | AlertsPageTemplateMap
    | undefined;

  const activeTemplate =
    (getUserSetting('alertsPage', 'activeTemplate') as string) ?? 'defaultTemplate';

  const saveTemplate = useCallback(
    (template: AlertsPageTemplate) => {
      setUserSettings<AlertsPageTemplateMap>('alertsPage', `templates`, {
        [String(template.id)]: template,
        ...detectionTemplates,
      });
    },
    [setUserSettings, detectionTemplates]
  );

  const setActiveTemplate = useCallback(
    (templateId) => {
      setUserSettings('alertsPage', 'activeTemplate', templateId);
    },
    [setUserSettings]
  );

  const getTemplateBasedSettingId = useCallback(
    (settingId: string) => {
      return `template-${activeTemplate}.${settingId}`;
    },
    [activeTemplate]
  );

  const setTemplateBasedSetting = useCallback(
    (settingScope: UserSettingScope, settingId: string, setting: unknown) => {
      if (activeTemplateRef.current !== activeTemplate) {
        return;
      }
      const newSettingId = getTemplateBasedSettingId(settingId);
      setUserSettings(settingScope, newSettingId, setting);
    },
    [getTemplateBasedSettingId, setUserSettings, activeTemplate]
  );

  const getTemplateBasedSetting = useCallback(
    <T = unknown>(settingScope: UserSettingScope, settingId: string): T | undefined => {
      const templateBasedSettingId = getTemplateBasedSettingId(settingId);
      return getUserSetting<T>(settingScope, templateBasedSettingId);
    },
    [getTemplateBasedSettingId, getUserSetting]
  );

  useEffect(() => {
    activeTemplateRef.current = activeTemplate;
  }, [activeTemplate]);

  return {
    templates: detectionTemplates,
    activeTemplate,
    saveTemplate,
    setActiveTemplate,
    setTemplateBasedSetting,
    getTemplateBasedSetting,
  };
};
