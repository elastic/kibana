/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const toolLabels = {
  breadcrumb: {
    toolsPill: i18n.translate('workchatApp.integrations.breadcrumb.tools', {
      defaultMessage: 'Tools',
    }),
    editToolPill: i18n.translate('workchatApp.integrations.breadcrumb.editTool', {
      defaultMessage: 'Edit tool',
    }),
    createToolPill: i18n.translate('workchatApp.integrations.breadcrumb.createTool', {
      defaultMessage: 'Create tool',
    }),
  },
  notifications: {
    toolCreatedToastText: i18n.translate(
      'workchatApp.integrations.notifications.toolCreatedToastText',
      {
        defaultMessage: 'Tool created',
      }
    ),
    toolUpdatedToastText: i18n.translate(
      'workchatApp.integrations.notifications.toolUpdatedToastText',
      {
        defaultMessage: 'Tool updated',
      }
    ),
    toolDeletedToastText: i18n.translate(
      'workchatApp.integrations.notifications.toolDeletedToastText',
      {
        defaultMessage: 'Tool successfully deleted',
      }
    ),
  },
  editView: {
    createToolTitle: i18n.translate('workchatApp.integrations.editView.createTitle', {
      defaultMessage: 'Create a new tool',
    }),
    editToolTitle: i18n.translate('workchatApp.integrations.editView.editTitle', {
      defaultMessage: 'Edit tool',
    }),
    cancelButtonLabel: i18n.translate('workchatApp.integrations.editView.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonLabel: i18n.translate('workchatApp.integrations.editView.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
  },
  listView: {
    addToolLabel: i18n.translate('workchatApp.integrations.listView.addTool', {
      defaultMessage: 'Add tool',
    }),
    browseToolLabel: i18n.translate('workchatApp.integrations.listView.browseTool', {
      defaultMessage: 'Browse tools',
    }),
  },
};
