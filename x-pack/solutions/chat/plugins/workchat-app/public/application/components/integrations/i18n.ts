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
    deleteButtonLabel: i18n.translate('workchatApp.integrations.editView.deleteButtonLabel', {
      defaultMessage: 'Delete',
    }),
    baseConfigurationTitle: i18n.translate(
      'workchatApp.integrations.editView.baseConfigurationTitle',
      {
        defaultMessage: 'Base configuration',
      }
    ),
    baseConfigurationDescription: i18n.translate(
      'workchatApp.integrations.editView.baseConfigurationDescription',
      {
        defaultMessage: 'Configure your tool',
      }
    ),
    nameLabel: i18n.translate('workchatApp.integrations.editView.nameLabel', {
      defaultMessage: 'Name',
    }),
    nameRequired: i18n.translate('workchatApp.integrations.editView.nameRequired', {
      defaultMessage: 'Name is required',
    }),
    descriptionLabel: i18n.translate('workchatApp.integrations.editView.descriptionLabel', {
      defaultMessage: 'Description',
    }),
    descriptionRequired: i18n.translate('workchatApp.integrations.editView.descriptionRequired', {
      defaultMessage: 'Description is required',
    }),
    typeLabel: i18n.translate('workchatApp.integrations.editView.typeLabel', {
      defaultMessage: 'Type',
    }),
    deleteModalTitle: i18n.translate('workchatApp.integrations.editView.deleteModalTitle', {
      defaultMessage: 'Delete tool',
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
