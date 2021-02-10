/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { firstValueFrom } from '@kbn/std';
import type { StartServicesAccessor } from 'src/core/public';
import type { SpacesApiUi } from 'src/plugins/spaces_oss/public';
import type { PluginsStart } from '../../plugin';
import { DEFAULT_OBJECT_NOUN } from '../components/constants';

export function createRedirectLegacyUrl(
  getStartServices: StartServicesAccessor<PluginsStart>
): SpacesApiUi['redirectLegacyUrl'] {
  return async function (path: string, objectNoun: string = DEFAULT_OBJECT_NOUN) {
    const [{ notifications, application }] = await getStartServices();
    const { currentAppId$, navigateToApp } = application;
    const appId = await firstValueFrom(currentAppId$); // retrieve the most recent value from the BehaviorSubject

    const title = i18n.translate('xpack.spaces.shareToSpace.redirectLegacyUrlToast.title', {
      defaultMessage: `We redirected you to a new URL`,
    });
    const text = i18n.translate('xpack.spaces.shareToSpace.redirectLegacyUrlToast.text', {
      defaultMessage: `The {objectNoun} you're looking for has a new location. Use this URL from now on.`,
      values: { objectNoun },
    });
    notifications.toasts.addInfo({ title, text });
    navigateToApp(appId!, { replace: true, path });
  };
}
