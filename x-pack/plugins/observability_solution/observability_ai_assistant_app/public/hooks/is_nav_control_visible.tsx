/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { combineLatest } from 'rxjs';
import { DEFAULT_APP_CATEGORIES, type PublicAppInfo } from '@kbn/core/public';
import { AIAssistantType } from '@kbn/ai-assistant-management-plugin/public';
import { useKibana } from './use_kibana';

function getVisibility(
  appId: string | undefined,
  applications: ReadonlyMap<string, PublicAppInfo>,
  preferredAssistantType: AIAssistantType
) {
  if (preferredAssistantType === AIAssistantType.Never) {
    return false;
  }

  const categoryId =
    (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;

  if (preferredAssistantType === AIAssistantType.Observability) {
    return categoryId !== DEFAULT_APP_CATEGORIES.security.id;
  }

  return categoryId === DEFAULT_APP_CATEGORIES.observability.id;
}

export function useIsNavControlVisible() {
  const [isVisible, setIsVisible] = useState(false);

  const {
    services: {
      application: { currentAppId$, applications$ },
      plugins: {
        start: { aiAssistantManagementSelection },
      },
    },
  } = useKibana();

  useEffect(() => {
    const appSubscription = combineLatest([
      currentAppId$,
      applications$,
      aiAssistantManagementSelection.aiAssistantType$,
    ]).subscribe({
      next: ([appId, applications, preferredAssistantType]) => {
        setIsVisible(getVisibility(appId, applications, preferredAssistantType));
      },
    });

    return appSubscription.unsubscribe;
  }, [currentAppId$, applications$, aiAssistantManagementSelection.aiAssistantType$]);

  return {
    isVisible,
  };
}
