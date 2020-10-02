/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SecurityOSSPluginSetup,
  SecurityOSSPluginStart,
} from '../../../../../src/plugins/security_oss/public';
import { insecureClusterAlertTitle, insecureClusterAlertText } from './components';

interface SetupDeps {
  securityOssSetup: SecurityOSSPluginSetup;
}

interface StartDeps {
  securityOssStart: SecurityOSSPluginStart;
}

export class SecurityCheckupService {
  private securityOssStart?: SecurityOSSPluginStart;

  public setup({ securityOssSetup }: SetupDeps) {
    securityOssSetup.insecureCluster.setAlertTitle(insecureClusterAlertTitle);
    securityOssSetup.insecureCluster.setAlertText(
      insecureClusterAlertText((persist: boolean) => this.onDismiss(persist))
    );
  }

  public start({ securityOssStart }: StartDeps) {
    this.securityOssStart = securityOssStart;
  }

  private onDismiss(persist: boolean) {
    if (this.securityOssStart) {
      this.securityOssStart.insecureCluster.hideAlert(persist);
    }
  }

  public stop() {}
}
