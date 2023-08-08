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
      if (!val) {
        throw new Error('Host URL required');
      }
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
            defaultMessage: 'Host address must begin with a domain name or IP address',
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
      if (val.length === 0) {
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostRequiredError', {
            defaultMessage: 'Host is required',
          }),
          index: idx,
        });
      } else {
        res.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.logstashHostError', {
            defaultMessage: 'Invalid Host',
          }),
          index: idx,
        });
      }
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

export function validateKafkaUsername(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaUsernameIsRequired', {
        defaultMessage: 'Username is required',
      }),
    ];
  }
}

export function validateKafkaPassword(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaPasswordIsRequired', {
        defaultMessage: 'Password is required',
      }),
    ];
  }
}

export function validateCATrustedFingerPrint(value: string) {
  if (value !== '' && !value.match(/^[a-zA-Z0-9]+$/)) {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.caTrusterdFingerprintInvalidErrorMessage', {
        defaultMessage:
          'CA trusted fingerprint should be valid HEX encoded SHA-256 of a CA certificate',
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

export function validateKafkaDefaultTopic(value: string) {
  if (!value || value === '') {
    return [
      i18n.translate('xpack.fleet.settings.outputForm.kafkaDefaultTopicRequiredMessage', {
        defaultMessage: 'Default topic is required',
      }),
    ];
  }
}

export function validateKafkaTopics(
  topics: Array<{
    topic: string;
  }>
) {
  const errors: Array<{
    message: string;
    index: number;
  }> = [];

  topics.forEach((topic, index) => {
    if (!topic.topic || topic.topic === '') {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaTopicRequiredMessage', {
          defaultMessage: 'Topic is required',
        }),
        index,
      });
    }
  });
  if (errors.length) {
    return errors;
  }
}

export function validateKafkaHeaders(pairs: Array<{ key: string; value: string }>) {
  const errors: Array<{
    message: string;
    index: number;
    hasKeyError: boolean;
    hasValueError: boolean;
  }> = [];

  const existingKeys: Set<string> = new Set();

  pairs.forEach((pair, index) => {
    const { key, value } = pair;

    const hasKey = !!key;
    const hasValue = !!value;

    if (hasKey && !hasValue) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHeadersMissingKeyError', {
          defaultMessage: 'Missing value for key "{key}"',
          values: { key },
        }),
        index,
        hasKeyError: false,
        hasValueError: true,
      });
    } else if (!hasKey && hasValue) {
      errors.push({
        message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHeadersMissingValueError', {
          defaultMessage: 'Missing key for value "{value}"',
          values: { value },
        }),
        index,
        hasKeyError: true,
        hasValueError: false,
      });
    } else if (hasKey && hasValue) {
      if (existingKeys.has(key)) {
        errors.push({
          message: i18n.translate('xpack.fleet.settings.outputForm.kafkaHeadersDuplicateKeyError', {
            defaultMessage: 'Duplicate key "{key}"',
            values: { key },
          }),
          index,
          hasKeyError: true,
          hasValueError: false,
        });
      } else {
        existingKeys.add(key);
      }
    }
  });
  if (errors.length) {
    return errors;
  }
}
