/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useSecuritySolutionUserSettings } from '../../../common/user_settings/use_security_solution_user_settings';
import type { AlertsPageTemplate, AlertsPageTemplateMap } from './types';

const fakeTemplateData = {
  jkTemplate: {
    id: 'jkTemplate',
    label: 'JK Template',
  },
};

export const useTemplates = () => {
  const { getUserSetting, setUserSettings } = useSecuritySolutionUserSettings();

  const detectionTemplates = getUserSetting('alertsPage', 'templates') as
    | AlertsPageTemplateMap
    | undefined;

  const activeTemplate = getUserSetting('alertsPage', 'activeTemplate') as string | undefined;

  const saveTemplate = useCallback(
    (template: AlertsPageTemplate) => {
      setUserSettings<AlertsPageTemplateMap>('alertsPage', `templates`, {
        [String(template.id)]: template,
        ...detectionTemplates
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

  return {
    templates: detectionTemplates,
    activeTemplate,
    saveTemplate,
    setActiveTemplate,
  };
};
