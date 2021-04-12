/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { SecurityPluginStart } from '../../security/public';
import { getIsCloudEnabled } from '../common/is_cloud_enabled';
import { ELASTIC_SUPPORT_LINK } from '../common/constants';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { createUserMenuLinks } from './user_menu_links';
import { getFullCloudUrl } from './utils';

export interface CloudConfigType {
  id?: string;
  cname?: string;
  base_url?: string;
  profile_url?: string;
  deployment_url?: string;
  organization_url?: string;
}

interface CloudSetupDependencies {
  home?: HomePublicPluginSetup;
}

interface CloudStartDependencies {
  security?: SecurityPluginStart;
}

export interface CloudSetup {
  cloudId?: string;
  cname?: string;
  baseUrl?: string;
  deploymentUrl?: string;
  profileUrl?: string;
  organizationUrl?: string;
  isCloudEnabled: boolean;
}

export class CloudPlugin implements Plugin<CloudSetup> {
  private config!: CloudConfigType;
  private isCloudEnabled: boolean;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudConfigType>();
    this.isCloudEnabled = false;
  }

  public setup(core: CoreSetup, { home }: CloudSetupDependencies) {
    const {
      id,
      cname,
      profile_url: profileUrl,
      organization_url: organizationUrl,
      deployment_url: deploymentUrl,
      base_url: baseUrl,
    } = this.config;
    this.isCloudEnabled = getIsCloudEnabled(id);

    if (home) {
      home.environment.update({ cloud: this.isCloudEnabled });
      if (this.isCloudEnabled) {
        home.tutorials.setVariable('cloud', { id, baseUrl, profileUrl });
      }
    }

    return {
      cloudId: id,
      cname,
      baseUrl,
      deploymentUrl: getFullCloudUrl(baseUrl, deploymentUrl),
      profileUrl: getFullCloudUrl(baseUrl, profileUrl),
      organizationUrl: getFullCloudUrl(baseUrl, organizationUrl),
      isCloudEnabled: this.isCloudEnabled,
    };
  }

  public start(coreStart: CoreStart, { security }: CloudStartDependencies) {
    const { deployment_url: deploymentUrl, base_url: baseUrl } = this.config;
    coreStart.chrome.setHelpSupportUrl(ELASTIC_SUPPORT_LINK);
    if (baseUrl && deploymentUrl) {
      coreStart.chrome.setCustomNavLink({
        title: i18n.translate('xpack.cloud.deploymentLinkLabel', {
          defaultMessage: 'Manage this deployment',
        }),
        euiIconType: 'arrowLeft',
        href: getFullCloudUrl(baseUrl, deploymentUrl),
      });
    }

    if (security && this.isCloudEnabled) {
      const userMenuLinks = createUserMenuLinks(this.config);
      security.navControlService.addUserMenuLinks(userMenuLinks);
    }
  }
}
