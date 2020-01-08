/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'src/core/public';
import { SpacesManager } from '../spaces_manager';
import { NavControlPopover } from './nav_control_popover';

export function initSpacesNavControl(spacesManager: SpacesManager, core: CoreStart) {
  const I18nContext = core.i18n.Context;
  core.chrome.navControls.registerLeft({
    order: 1000,
    mount(targetDomElement: HTMLElement) {
      if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
        return () => null;
      }

      ReactDOM.render(
        <I18nContext>
          <NavControlPopover
            spacesManager={spacesManager}
            anchorPosition="downLeft"
            capabilities={core.application.capabilities}
            navigateToApp={core.application.navigateToApp}
          />
        </I18nContext>,
        targetDomElement
      );

      return () => {
        ReactDOM.unmountComponentAtNode(targetDomElement);
      };
    },
  });
}
