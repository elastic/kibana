/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { SecurityPluginStart } from '../../security/public';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { ELASTIC_SUPPORT_LINK } from '../common/constants';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { createUserMenuLinks } from './user_menu_links';

export interface CloudConfigType {
  id?: string;
  resetPasswordUrl?: string;
  deploymentUrl?: string;
  accountUrl?: string;
}

interface CloudSetupDependencies {
  home?: HomePublicPluginSetup;
}

interface CloudStartDependencies {
  security?: SecurityPluginStart;
}

export interface CloudSetup {
  cloudId?: string;
  cloudDeploymentUrl?: string;
  isCloudEnabled: boolean;
  resetPasswordUrl?: string;
  accountUrl?: string;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private config!: CloudConfigType;
  private isCloudEnabled: boolean;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = false;
  }

  public async setup(core: CoreSetup, { home }: CloudSetupDependencies) {
    const { id, resetPasswordUrl, deploymentUrl } = this.config;
    this.isCloudEnabled = getIsCloudEnabled(id);

    if (home) {
      home.environment.update({ cloud: this.isCloudEnabled });
      if (this.isCloudEnabled) {
        home.tutorials.setVariable('cloud', { id, resetPasswordUrl });
      }
    }

    return {
      cloudId: id,
      cloudDeploymentUrl: deploymentUrl,
      isCloudEnabled: this.isCloudEnabled,
    };
  }

  public start(coreStart: CoreStart, { security }: CloudStartDependencies) {
    const { deploymentUrl } = this.config;
    coreStart.chrome.setHelpSupportUrl(ELASTIC_SUPPORT_LINK);
    if (deploymentUrl) {
      coreStart.chrome.setCustomNavLink({
        title: i18n.translate('xpack.cloud.deploymentLinkLabel', {
          defaultMessage: 'Manage this deployment',
        }),
        euiIconType: 'arrowLeft',
        href: deploymentUrl,
      });
    }

    if (security && this.isCloudEnabled) {
      const userMenuLinks = createUserMenuLinks(this.config);
      security.navControlService.addUserMenuLinks(userMenuLinks);
    }
  }
}
