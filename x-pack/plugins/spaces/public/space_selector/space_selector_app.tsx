/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, AppMountParameters } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { SpacesManager } from '../spaces_manager';

interface CreateDeps {
  application: CoreSetup['application'];
  spacesManager: SpacesManager;
  getStartServices: CoreSetup['getStartServices'];
}

export const spaceSelectorApp = Object.freeze({
  id: 'space_selector',
  create({ application, getStartServices, spacesManager }: CreateDeps) {
    application.register({
      id: this.id,
      title: i18n.translate('xpack.spaces.spaceSelector.appTitle', {
        defaultMessage: 'Select a space',
      }),
      chromeless: true,
      appRoute: '/spaces/space_selector',
      mount: async (params: AppMountParameters) => {
        const [[coreStart], { renderSpaceSelectorApp }] = await Promise.all([
          getStartServices(),
          import('./space_selector'),
        ]);
        return renderSpaceSelectorApp(coreStart.i18n, params.element, { spacesManager });
      },
    });
  },
});
