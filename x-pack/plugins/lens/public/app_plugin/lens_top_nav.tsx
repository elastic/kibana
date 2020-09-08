/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import { LensTopNavActions } from './types';

export function getLensTopNavConfig(options: {
  isLinkedToOriginatingApp: boolean;
  actions: LensTopNavActions;
  savingPermitted: boolean;
}): TopNavMenuData[] {
  const { isLinkedToOriginatingApp, actions, savingPermitted } = options;
  const topNavMenu: TopNavMenuData[] = [];
  if (isLinkedToOriginatingApp) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.saveAndReturn', {
        defaultMessage: 'Save and return',
      }),
      emphasize: true,
      iconType: 'check',
      run: actions.saveAndReturn,
      testId: 'lnsApp_saveAndReturnButton',
      disableButton: !savingPermitted,
    });
  }

  topNavMenu.push({
    label: isLinkedToOriginatingApp
      ? i18n.translate('xpack.lens.app.saveAs', {
          defaultMessage: 'Save as',
        })
      : i18n.translate('xpack.lens.app.save', {
          defaultMessage: 'Save',
        }),
    emphasize: !isLinkedToOriginatingApp,
    run: actions.showSaveModal,
    testId: 'lnsApp_saveButton',
    disableButton: !savingPermitted,
  });

  if (isLinkedToOriginatingApp) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.cancel', {
        defaultMessage: 'cancel',
      }),
      run: actions.cancel,
      testId: 'lnsApp_cancelButton',
    });
  }
  return topNavMenu;
}
