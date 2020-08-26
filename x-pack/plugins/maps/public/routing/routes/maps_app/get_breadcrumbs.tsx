/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getNavigateToApp } from '../../../kibana_services';
// @ts-expect-error
import { goToSpecifiedPath } from '../../maps_router';

export const unsavedChangesWarning = i18n.translate(
  'xpack.maps.breadCrumbs.unsavedChangesWarning',
  {
    defaultMessage: 'Your map has unsaved changes. Are you sure you want to leave?',
  }
);

export function getBreadcrumbs({
  title,
  getHasUnsavedChanges,
  originatingApp,
  getAppNameFromId,
}: {
  title: string;
  getHasUnsavedChanges: () => boolean;
  originatingApp?: string;
  getAppNameFromId?: (id: string) => string;
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

  breadcrumbs.push({
    text: i18n.translate('xpack.maps.mapController.mapsBreadcrumbLabel', {
      defaultMessage: 'Maps',
    }),
    onClick: () => {
      if (getHasUnsavedChanges()) {
        const navigateAway = window.confirm(unsavedChangesWarning);
        if (navigateAway) {
          goToSpecifiedPath('/');
        }
      } else {
        goToSpecifiedPath('/');
      }
    },
  });

  breadcrumbs.push({ text: title });

  return breadcrumbs;
}
