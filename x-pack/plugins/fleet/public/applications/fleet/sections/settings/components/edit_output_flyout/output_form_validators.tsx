/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { safeLoad } from 'js-yaml';

export function validateESHosts(value: string[]) {
  const res: Array<{ message: string; index?: number }> = [];
  const urlIndexes: { [key: string]: number[] } = {};
  value.forEach((val, idx) => {
    try {
      const urlParsed = new URL(val);
      if (!['http:', 'https:'].includes(urlParsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.elasticHostError', {
          defaultMessage: 'Invalid URL',
        }),
        index: idx,
      });
    }

    const curIndexes = urlIndexes[val] || [];
    urlIndexes[val] = [...curIndexes, idx];
  });

  Object.values(urlIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.elasticHostDuplicateError', {
            defaultMessage: 'Duplicate URL',
          }),
          index,
        })
      );
    });

  if (value.length === 0) {
    res.push({
      message: i18n.translate('xpack.fleet.settings.outputForm.elasticUrlRequiredError', {
        defaultMessage: 'URL is required',
      }),
    });
  }

  if (res.length) {
    return res;
  }
}

export function validateLogstashHosts(value: string[]) {
  const res: Array<{ message: string; index?: number }> = [];
  const urlIndexes: { [key: string]: number[] } = {};
  value.forEach((val, idx) => {
    try {
      if (val.match(/^http([s]){0,1}:\/\//)) {
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostProtocolError', {
            defaultMessage: 'Invalid logstash host should not start with http(s)',
          }),
          index: idx,
        });
        return;
      }

      const url = new URL(`http://${val}`);

      if (url.host !== val) {
        throw new Error('Invalid host');
      }
    } catch (error) {
      res.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostError', {
          defaultMessage: 'Invalid Host',
        }),
        index: idx,
      });
    }

    const curIndexes = urlIndexes[val] || [];
    urlIndexes[val] = [...curIndexes, idx];
  });

  Object.values(urlIndexes)
    .filter(({ length }) => length > 1)
    .forEach((indexes) => {
      indexes.forEach((index) =>
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostDuplicateError', {
            defaultMessage: 'Duplicate Host',
          }),
          index,
        })
      );
    });
  if (value.length === 0) {
    res.push({
      message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostRequiredError', {
        defaultMessage: 'Host is required',
      }),
    });
  }

  if (res.length) {
    return res;
  }
}

export function validateYamlConfig(value: string) {
  try {
    safeLoad(value);
    return;
  } catch (error) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.invalidYamlFormatErrorMessage', {
        defaultMessage: 'Invalid YAML: {reason}',
        values: { reason: error.message },
      }),
    ];
  }
}

export function validateName(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.nameIsRequiredErrorMessage', {
        defaultMessage: 'Name is required',
      }),
    ];
  }
}

export function validateCATrustedFingerPrint(value: string) {
  if (value !== '' && !value.match(/^[a-zA-Z0-9]+$/)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.caTrusterdFingerprintInvalidErrorMessage', {
        defaultMessage: 'CA trusted fingerprint should be a base64 CA sha256 fingerprint',
      }),
    ];
  }
}

export function validateSSLCertificate(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.sslCertificateRequiredErrorMessage', {
        defaultMessage: 'SSL certificate is required',
      }),
    ];
  }
}

export function validateSSLKey(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.sslKeyRequiredErrorMessage', {
        defaultMessage: 'SSL key is required',
      }),
    ];
  }
}
