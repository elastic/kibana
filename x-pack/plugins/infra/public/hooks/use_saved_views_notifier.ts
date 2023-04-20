/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibanaContextForPlugin } from './use_kibana';

export const useSavedViewsNotifier = () => {
  const { notifications } = useKibanaContextForPlugin();

  const getViewFailure = (message?: string) => {
    notifications.toasts.danger({
      toastLifeTimeMs: 3000,
      title:
        message ||
        i18n.translate('xpack.infra.savedView.findError.title', {
          defaultMessage: `An error occurred while loading views.`,
        }),
    });
  };

  const setDefaultViewFailure = (message?: string) => {
    notifications.toasts.danger({
      toastLifeTimeMs: 3000,
      title:
        message ||
        i18n.translate('xpack.infra.savedView.errorOnMakeDefault.title', {
          defaultMessage: `An error updating the default view.`,
        }),
    });
  };

  const upsertViewFailure = (message?: string) => {
    notifications.toasts.danger({
      toastLifeTimeMs: 3000,
      title:
        message ||
        i18n.translate('xpack.infra.savedView.errorOnCreate.title', {
          defaultMessage: `An error occured saving view.`,
        }),
    });
  };

  return {
    getViewFailure,
    setDefaultViewFailure,
    upsertViewFailure,
  };
};
