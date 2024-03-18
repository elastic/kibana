/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { combineLatest } from 'rxjs';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { useKibana } from './use_kibana';

export function useIsNavControlVisible() {
  const [isVisible, setIsVisible] = useState(false);

  const {
    services: {
      application: { currentAppId$, applications$ },
    },
  } = useKibana();

  useEffect(() => {
    const appSubscription = combineLatest([currentAppId$, applications$]).subscribe({
      next: ([appId, applications]) => {
        const isObservabilityApp =
          appId &&
          applications.get(appId)?.category?.id === DEFAULT_APP_CATEGORIES.observability.id;

        setIsVisible(!!isObservabilityApp);
      },
    });

    return appSubscription.unsubscribe;
  }, [currentAppId$, applications$]);

  return {
    isVisible,
  };
}
