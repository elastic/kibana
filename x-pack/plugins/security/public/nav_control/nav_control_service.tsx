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
import { AuthenticatedUser } from '../../common/model';
import { SecurityNavControl } from './nav_control_component';

interface SetupDeps {
  securityLicense: SecurityLicense;
}

interface StartDeps {
  core: CoreStart;
}

export class SecurityNavControlService {
  private securityLicense!: SecurityLicense;

  private navControlRegistered!: boolean;

  private securityFeaturesSubscription?: Subscription;

  public setup({ securityLicense }: SetupDeps) {
    this.securityLicense = securityLicense;
  }

  public start({ core }: StartDeps) {
    this.securityFeaturesSubscription = this.securityLicense.features$.subscribe(
      ({ showLinks }) => {
        const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);

        const shouldRegisterNavControl =
          !isAnonymousPath && showLinks && !this.navControlRegistered;

        if (shouldRegisterNavControl) {
          const user = core.http.get('/api/security/v1/me', {
            headers: {
              'kbn-system-api': true,
            },
          }) as Promise<AuthenticatedUser>;
          this.registerSecurityNavControl(core, user);
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
    core: Pick<CoreStart, 'chrome' | 'http' | 'i18n' | 'application'>,
    user: Promise<AuthenticatedUser>
  ) {
    core.chrome.navControls.registerRight({
      order: 2000,
      mount: (el: HTMLElement) => {
        const I18nContext = core.i18n.Context;

        const props = {
          user,
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
