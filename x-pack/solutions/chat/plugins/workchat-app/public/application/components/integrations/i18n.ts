/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const integrationLabels = {
  breadcrumb: {
    integrationsPill: i18n.translate('workchatApp.integrations.breadcrumb.integrations', {
      defaultMessage: 'Integrations',
    }),
    editIntegrationPill: i18n.translate('workchatApp.integrations.breadcrumb.editIntegration', {
      defaultMessage: 'Edit integration',
    }),
    createIntegrationPill: i18n.translate('workchatApp.integrations.breadcrumb.createIntegration', {
      defaultMessage: 'Create integration',
    }),
  },
  notifications: {
    integrationCreatedToastText: i18n.translate(
      'workchatApp.integrations.notifications.integrationCreatedToastText',
      {
        defaultMessage: 'Integration created',
      }
    ),
    integrationUpdatedToastText: i18n.translate(
      'workchatApp.integrations.notifications.integrationUpdatedToastText',
      {
        defaultMessage: 'Integration updated',
      }
    ),
    integrationDeletedToastText: i18n.translate(
      'workchatApp.integrations.notifications.integrationDeletedToastText',
      {
        defaultMessage: 'Integration successfully deleted',
      }
    ),
  },
  editView: {
    createIntegrationTitle: i18n.translate('workchatApp.integrations.editView.createTitle', {
      defaultMessage: 'Create a new integration',
    }),
    editIntegrationTitle: i18n.translate('workchatApp.integrations.editView.editTitle', {
      defaultMessage: 'Edit integration',
    }),
    cancelButtonLabel: i18n.translate('workchatApp.integrations.editView.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonLabel: i18n.translate('workchatApp.integrations.editView.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
  },
  listView: {
    addIntegrationLabel: i18n.translate('workchatApp.integrations.listView.addIntegration', {
      defaultMessage: 'Add integration',
    }),
    browseIntegrationLabel: i18n.translate('workchatApp.integrations.listView.browseIntegration', {
      defaultMessage: 'Browse integrations',
    }),
  },
};
