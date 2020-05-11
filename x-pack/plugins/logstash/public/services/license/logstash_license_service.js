/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

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

  /**
   * Checks if the license is valid or the license can perform downgraded UI tasks.
   * Rejects if the plugin is not available due to license.
   */
  checkValidity() {
    return new Promise((resolve, reject) => {
      if (this.isAvailable) {
        return resolve();
      }

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
