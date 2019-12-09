/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subscription, Observable } from 'rxjs';
import { CoreStart } from 'src/core/public';
import ReactDOM from 'react-dom';
import React from 'react';
import { LicensingPluginSetup, ILicense } from '../../../licensing/server';
import { SecurityLicenseService } from '../../common/licensing';
import { AuthenticatedUser } from '../../common/model';
import { SecurityNavControl } from './nav_control_component';

interface SetupDeps {
  securityLicenseService: ReturnType<SecurityLicenseService['setup']>;
  licensing: LicensingPluginSetup;
}

interface StartDeps {
  core: CoreStart;
}

export class SecurityNavControlService {
  private securityLicenseService!: ReturnType<SecurityLicenseService['setup']>;

  private license$!: Observable<ILicense>;

  private navControlRegistered!: boolean;

  private licenseSubscription?: Subscription;

  public setup({ securityLicenseService, licensing }: SetupDeps) {
    this.securityLicenseService = securityLicenseService;
    this.license$ = licensing.license$;
    this.navControlRegistered = false;
  }

  public start({ core }: StartDeps) {
    this.licenseSubscription = this.license$.subscribe(rawLicense => {
      this.securityLicenseService.update(rawLicense);
      const showSecurityLinks = this.securityLicenseService.license.getFeatures().showLinks;

      const isAnonymousPath = core.http.anonymousPaths.isAnonymous(window.location.pathname);

      const shouldRegisterNavControl =
        !isAnonymousPath && showSecurityLinks && !this.navControlRegistered;

      if (shouldRegisterNavControl) {
        const user = core.http.get('/api/security/v1/me', {
          headers: {
            'kbn-system-api': true,
          },
        }) as Promise<AuthenticatedUser>;
        this.registerSecurityNavControl(core, user);
      }
    });
  }

  public stop() {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
      this.licenseSubscription = undefined;
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

    this.navControlRegistered = true;
  }
}
