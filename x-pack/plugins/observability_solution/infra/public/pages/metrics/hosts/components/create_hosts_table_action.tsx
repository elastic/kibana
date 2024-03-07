/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';

// -----------------------------------------------------------------------------
// Create and register an action which allows this embeddable to be created from
// the dashboard toolbar context menu.
// -----------------------------------------------------------------------------
export const registerCreateHostsTableAction = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: 'create_hosts_table',
    getIconType: () => 'editorCodeBlock',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel(
        {
          panelType: 'hosts_table',
        },
        true
      );
    },
    getDisplayName: () =>
      i18n.translate('xpack.infra.registerCreateHostsTableAction.', {
        defaultMessage: 'Hosts table',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', 'create_hosts_table');
};
