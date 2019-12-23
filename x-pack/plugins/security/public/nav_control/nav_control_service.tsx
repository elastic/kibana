/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subscription } from 'rxjs';
import { CoreStart } from 'src/core/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { SecurityLicense } from '../../common/licensing';
import { SecurityNavControl } from './nav_control_component';
import { AuthenticationServiceSetup } from '../authentication';

interface SetupDeps {
  securityLicense: SecurityLicense;
  getCurrentUser: AuthenticationServiceSetup['getCurrentUser'];
}

interface StartDeps {
  core: CoreStart;
}

export class SecurityNavControlService {
  private securityLicense!: SecurityLicense;
  private getCurrentUser!: AuthenticationServiceSetup['getCurrentUser'];

  private navControlRegistered!: boolean;

  private securityFeaturesSubscription?: Subscription;

  public setup({ securityLicense, getCurrentUser }: SetupDeps) {
    this.securityLicense = securityLicense;
    this.getCurrentUser = getCurrentUser;
  }

  public start({ core }: StartDeps) {
    this.securityFeaturesSubscription = this.securityLicense.features$.subscribe(
      ({ showLinks }) => {
        const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);

        const shouldRegisterNavControl =
          !isAnonymousPath && showLinks && !this.navControlRegistered;
        if (shouldRegisterNavControl) {
          this.registerSecurityNavControl(core);
        }
      }
    );
  }

  public stop() {
    if (this.securityFeaturesSubscription) {
      this.securityFeaturesSubscription.unsubscribe();
      this.securityFeaturesSubscription = undefined;
    }
    this.navControlRegistered = false;
  }

  private registerSecurityNavControl(
    core: Pick<CoreStart, 'chrome' | 'http' | 'i18n' | 'application'>
  ) {
    const currentUserPromise = this.getCurrentUser();
    core.chrome.navControls.registerRight({
      order: 2000,
      mount: (el: HTMLElement) => {
        const I18nContext = core.i18n.Context;

        const props = {
          user: currentUserPromise,
          editProfileUrl: core.http.basePath.prepend('/app/kibana#/account'),
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

    this.navControlRegistered = true;
  }
}
