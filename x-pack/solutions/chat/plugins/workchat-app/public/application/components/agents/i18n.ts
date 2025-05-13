/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const agentLabels = {
  breadcrumb: {
    agentsPill: i18n.translate('workchatApp.agents.breadcrumb.agents', {
      defaultMessage: 'Agents',
    }),
    editAgentPill: i18n.translate('workchatApp.agents.breadcrumb.editAgent', {
      defaultMessage: 'Edit agent',
    }),
    createAgensPill: i18n.translate('workchatApp.agents.breadcrumb.createAgent', {
      defaultMessage: 'Create agent',
    }),
  },
  notifications: {
    agentCreatedToastText: i18n.translate(
      'workchatApp.agents.notifications.agentCreatedToastText',
      {
        defaultMessage: 'Agent created',
      }
    ),
    agentUpdatedToastText: i18n.translate(
      'workchatApp.agents.notifications.agentCreatedToastText',
      {
        defaultMessage: 'Agent updated',
      }
    ),
  },
  editView: {
    createAgentTitle: i18n.translate('workchatApp.agents.editView.createTitle', {
      defaultMessage: 'Create a new agent',
    }),
    editAgentTitle: i18n.translate('workchatApp.agents.editView.editTitle', {
      defaultMessage: 'Edit agent',
    }),
    cancelButtonLabel: i18n.translate('workchatApp.agents.editView.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
    saveButtonLabel: i18n.translate('workchatApp.agents.editView.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
  },
};
