/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { MarkdownSimple } from '../../../../../../src/plugins/kibana_react/public';
import { PLUGIN } from '../../../common/constants';

export class LogstashLicenseService {
  constructor(license, navigateToApp, toasts) {
    this.license = license;
    this.navigateToApp = navigateToApp;
    this.toasts = toasts;
  }

  get enableLinks() {
    return this.calculated.enableLinks;
  }

  get isAvailable() {
    return this.calculated.isAvailable;
  }

  get isReadOnly() {
    return this.calculated.isReadOnly;
  }

  get message() {
    return this.calculated.message;
  }

  get isSecurityEnabled() {
    return this.license.getFeature(`security`).isEnabled;
  }

  notifyAndRedirect() {
    this.toasts.addDanger({
      title: (
        <MarkdownSimple>{this.license.getFeature(`features.${PLUGIN.ID}.message`)}</MarkdownSimple>
      ),
    });
    this.navigateToApp('kibana', '#/management');
  }

  /**
   * Checks if the license is valid or the license can perform downgraded UI tasks.
   * Otherwise, notifies and redirects.
   */
  checkValidity() {
    return new Promise((resolve, reject) => {
      if (this.isAvailable) {
        return resolve();
      }

      this.notifyAndRedirect();
      return reject();
    });
  }

  get calculated() {
    if (!this.license) {
      throw new Error(`No license available!`);
    }

    if (!this.isSecurityEnabled) {
      return {
        isAvailable: false,
        enableLinks: false,
        isReadOnly: false,
        message: i18n.translate('xpack.logstash.managementSection.enableSecurityDescription', {
          defaultMessage:
            'Security must be enabled in order to use Logstash pipeline management features.' +
            ' Please set xpack.security.enabled: true in your elasticsearch.yml.',
        }),
      };
    }

    if (!this.license.hasAtLeast('standard')) {
      return {
        isAvailable: false,
        enableLinks: false,
        isReadOnly: false,
        message: i18n.translate(
          'xpack.logstash.managementSection.licenseDoesNotSupportDescription',
          {
            defaultMessage:
              'Your {licenseType} license does not support Logstash pipeline management features. Please upgrade your license.',
            values: { licenseType: this.license.type },
          }
        ),
      };
    }

    if (!this.license.isActive) {
      return {
        isAvailable: true,
        enableLinks: true,
        isReadonly: true,
        message: i18n.translate(
          'xpack.logstash.managementSection.pipelineCrudOperationsNotAllowedDescription',
          {
            defaultMessage:
              'You cannot edit, create, or delete your Logstash pipelines because your {licenseType} license has expired.',
            values: { licenseType: this.license.type },
          }
        ),
      };
    }

    return {
      isAvailable: true,
      enableLinks: true,
      isReadOnly: false,
    };
  }
}
