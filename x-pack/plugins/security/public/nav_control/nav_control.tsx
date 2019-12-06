/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { CoreStart } from 'src/core/public';

import { AuthenticatedUser } from '../../common/model';
import { SecurityNavControl } from './nav_control_component';

export function registerSecurityNavControl(
  core: Pick<CoreStart, 'chrome' | 'http' | 'i18n' | 'application'>,
  user: Promise<AuthenticatedUser>
) {
  core.chrome.navControls.registerRight({
    order: 2000,
    mount: (el: HTMLElement) => {
      const I18nContext = core.i18n.Context;

      const props = {
        user,
        editProfileUrl: core.http.basePath.prepend('/app/kibana/#account'),
        logoutUrl: core.http.basePath.prepend(`/logout`),
      };
      ReactDOM.render(
        <I18nContext>
          <SecurityNavControl {...props} />
        </I18nContext>,
        el
      );

      return () => ReactDOM.unmountComponentAtNode(el);
    },
  });
}
