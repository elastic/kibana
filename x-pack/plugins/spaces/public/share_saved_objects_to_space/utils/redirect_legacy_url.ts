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

export function createRedirectLegacyUrl(
  getStartServices: StartServicesAccessor<PluginsStart>
): SpacesApiUi['redirectLegacyUrl'] {
  return async function (path: string) {
    const [{ notifications, application }] = await getStartServices();
    const { currentAppId$, navigateToApp } = application;
    const appId = await firstValueFrom(currentAppId$); // retrieve the most recent value from the BehaviorSubject

    const title = i18n.translate('xpack.spaces.shareToSpace.redirectLegacyUrlToast.title', {
      defaultMessage: 'Redirected from legacy URL',
    });
    const text = i18n.translate('xpack.spaces.shareToSpace.redirectLegacyUrlToast.text', {
      defaultMessage:
        'You used a legacy URL to navigate to this page. This URL changed in Kibana 8.0, so we redirected you to the new one. You should use this new URL in the future.',
    });
    notifications.toasts.addInfo({ title, text });
    navigateToApp(appId!, { replace: true, path });
  };
}
