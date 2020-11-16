/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import { LensTopNavActions } from './types';

export function getLensTopNavConfig(options: {
  showSaveAndReturn: boolean;
  showExportToCSV: boolean;
  showCancel: boolean;
  isByValueMode: boolean;
  actions: LensTopNavActions;
  savingPermitted: boolean;
}): TopNavMenuData[] {
  const { showSaveAndReturn, showCancel, actions, savingPermitted, showExportToCSV } = options;
  const topNavMenu: TopNavMenuData[] = [];

  const saveButtonLabel = options.isByValueMode
    ? i18n.translate('xpack.lens.app.addToLibrary', {
        defaultMessage: 'Save to library',
      })
    : options.showSaveAndReturn
    ? i18n.translate('xpack.lens.app.saveAs', {
        defaultMessage: 'Save as',
      })
    : i18n.translate('xpack.lens.app.save', {
        defaultMessage: 'Save',
      });

  if (showCancel) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.cancel', {
        defaultMessage: 'cancel',
      }),
      run: actions.cancel,
      testId: 'lnsApp_cancelButton',
      description: i18n.translate('xpack.lens.app.cancelButtonAriaLabel', {
        defaultMessage: 'Return to the last app without saving changes',
      }),
    });
  }

  if (showExportToCSV) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.downloadCSV', {
        defaultMessage: 'Download as CSV',
      }),
      run: actions.exportToCSV,
      testId: 'lnsApp_downloadCSVButton',
      description: i18n.translate('xpack.lens.app.cancelButtonAriaLabel', {
        defaultMessage: 'Download the data as CSV file',
      }),
    });
  }

  topNavMenu.push({
    label: saveButtonLabel,
    iconType: !showSaveAndReturn ? 'save' : undefined,
    emphasize: !showSaveAndReturn,
    run: actions.showSaveModal,
    testId: 'lnsApp_saveButton',
    description: i18n.translate('xpack.lens.app.saveButtonAriaLabel', {
      defaultMessage: 'Save the current lens visualization',
    }),
    disableButton: !savingPermitted,
  });

  if (showSaveAndReturn) {
    topNavMenu.push({
      label: i18n.translate('xpack.lens.app.saveAndReturn', {
        defaultMessage: 'Save and return',
      }),
      emphasize: true,
      iconType: 'checkInCircleFilled',
      run: actions.saveAndReturn,
      testId: 'lnsApp_saveAndReturnButton',
      disableButton: !savingPermitted,
      description: i18n.translate('xpack.lens.app.saveAndReturnButtonAriaLabel', {
        defaultMessage: 'Save the current lens visualization and return to the last app',
      }),
    });
  }

  return topNavMenu;
}
