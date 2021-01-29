/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getCoreOverlays, getNavigateToApp } from '../../../kibana_services';
import { goToSpecifiedPath } from '../../../render_app';
import { getAppTitle } from '../../../../common/i18n_getters';

export const unsavedChangesWarning = i18n.translate(
  'xpack.maps.breadCrumbs.unsavedChangesWarning',
  {
    defaultMessage: 'Leave Maps with unsaved work?',
  }
);

export const unsavedChangesTitle = i18n.translate('xpack.maps.breadCrumbs.unsavedChangesTitle', {
  defaultMessage: 'Unsaved changes',
});

export function getBreadcrumbs({
  pageTitle,
  isByValue,
  getHasUnsavedChanges,
  originatingApp,
  getAppNameFromId,
}: {
  pageTitle: string;
  isByValue: boolean;
  getHasUnsavedChanges: () => boolean;
  originatingApp?: string;
  getAppNameFromId?: (id: string) => string | undefined;
}) {
  const breadcrumbs = [];

  if (originatingApp && getAppNameFromId) {
    breadcrumbs.push({
      onClick: () => {
        getNavigateToApp()(originatingApp);
      },
      text: getAppNameFromId(originatingApp),
    });
  }

  if (!isByValue) {
    breadcrumbs.push({
      text: getAppTitle(),
      onClick: async () => {
        if (getHasUnsavedChanges()) {
          const confirmed = await getCoreOverlays().openConfirm(unsavedChangesWarning, {
            title: unsavedChangesTitle,
            'data-test-subj': 'appLeaveConfirmModal',
          });
          if (confirmed) {
            goToSpecifiedPath('/');
          }
        } else {
          goToSpecifiedPath('/');
        }
      },
    });
  }

  breadcrumbs.push({ text: pageTitle });

  return breadcrumbs;
}
