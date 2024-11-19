/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { CANVAS_APP } from '../../../common/lib';

export function useGetAppContext(core: CoreStart) {
  const currentAppId = useObservable(core.application.currentAppId$, undefined);
  const getAppContext = useMemo(() => {
    return () => ({
      getCurrentPath: () => {
        const urlToApp = core.application.getUrlForApp(currentAppId ?? CANVAS_APP);
        const inAppPath = window.location.pathname.replace(urlToApp, '');

        return inAppPath + window.location.search + window.location.hash;
      },
      currentAppId: CANVAS_APP,
    });
  }, [currentAppId, core.application]);
  return getAppContext;
}
