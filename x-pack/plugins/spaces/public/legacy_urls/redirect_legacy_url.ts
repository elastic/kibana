/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { DEFAULT_OBJECT_NOUN } from '../constants';
import type { PluginsStart } from '../plugin';
import type { SpacesApiUi } from '../ui_api';
import type { RedirectLegacyUrlParams } from './types';

export function createRedirectLegacyUrl(
  getStartServices: StartServicesAccessor<PluginsStart>
): SpacesApiUi['redirectLegacyUrl'] {
  return async function ({
    path,
    aliasPurpose,
    objectNoun = DEFAULT_OBJECT_NOUN,
  }: RedirectLegacyUrlParams) {
    const [{ notifications, application }] = await getStartServices();
    const { currentAppId$, navigateToApp } = application;
    const appId = await currentAppId$.pipe(first()).toPromise(); // retrieve the most recent value from the BehaviorSubject

    if (aliasPurpose === 'savedObjectConversion') {
      const title = i18n.translate('xpack.spaces.redirectLegacyUrlToast.title', {
        defaultMessage: `We redirected you to a new URL`,
      });
      const text = i18n.translate('xpack.spaces.redirectLegacyUrlToast.text', {
        defaultMessage: `The {objectNoun} you're looking for has a new location. Use this URL from now on.`,
        values: { objectNoun },
      });
      notifications.toasts.addInfo({ title, text });
    }

    await navigateToApp(appId!, { replace: true, path });
  };
}
