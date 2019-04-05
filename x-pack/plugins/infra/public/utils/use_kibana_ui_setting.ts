/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo } from 'react';

import { getNewPlatform } from 'ui/new_platform';
import { useObservable } from './use_observable';

export const useKibanaUiSetting = (key: string, defaultValue?: any) => {
  const uiSettingsClient = useMemo(() => getNewPlatform().setup.core.uiSettings, [getNewPlatform]);

  const uiSetting$ = useMemo(() => uiSettingsClient.get$(key, defaultValue), [uiSettingsClient]);
  const uiSetting = useObservable(uiSetting$);

  const setUiSetting = useCallback((value: any) => uiSettingsClient.set(key, value), [
    uiSettingsClient,
  ]);

  return [uiSetting, setUiSetting];
};
