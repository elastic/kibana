/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const assistantLabels = {
  breadcrumb: {
    assistantsPill: i18n.translate('workchatApp.assistants.breadcrumb.assistants', {
      defaultMessage: 'Assistants',
    }),
    assistantDetailsPill: i18n.translate('workchatApp.assistants.breadcrumb.assistantOverview', {
      defaultMessage: 'Overview',
    }),
    assistantWorkflowPill: i18n.translate('workchatApp.assistants.breadcrumb.assistantWorkflow', {
      defaultMessage: 'Workflows',
    }),
  },
  notifications: {
    assistantCreatedToastText: i18n.translate(
      'workchatApp.assistants.notifications.assistantCreatedToastText',
      {
        defaultMessage: 'Assistant created',
      }
    ),
    assistantUpdatedToastText: i18n.translate(
      'workchatApp.assistants.notifications.assistantCreatedToastText',
      {
        defaultMessage: 'Assistant updated',
      }
    ),
  },
  editView: {
    createassistantTitle: i18n.translate('workchatApp.assistants.editView.createTitle', {
      defaultMessage: 'Create a new assistant',
    }),
    editassistantTitle: i18n.translate('workchatApp.assistants.editView.editTitle', {
      defaultMessage: 'Edit assistant',
    }),
    cancelButtonLabel: i18n.translate('workchatApp.assistants.editView.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonLabel: i18n.translate('workchatApp.assistants.editView.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
    editButtonLabel: i18n.translate('workchatApp.assistants.editView.editButtonLabel', {
      defaultMessage: 'Edit',
    }),
  },
};
