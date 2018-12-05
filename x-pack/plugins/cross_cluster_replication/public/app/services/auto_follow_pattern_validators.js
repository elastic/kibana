/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { validateIndexPattern } from 'ui/index_patterns';
import { arrify } from '../../../common/services/utils';

export const validateName = (name = '') => {
  let errorMsg = null;

  if (!name || !name.trim()) {
    errorMsg = i18n.translate(
      'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorEmptyName',
      { defaultMessage: 'Name is required.' }
    );
  }

  if(name.includes(' ')) {
    errorMsg = i18n.translate('xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorSpace', {
      defaultMessage: 'Remove the spaces from your name.'
    });
  }

  if (name[0] === '_') {
    errorMsg = i18n.translate(
      'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorFirstChar',
      { defaultMessage: "Name can not start with the '_' character." }
    );
  }

  if (name.includes(',')) {
    errorMsg = i18n.translate(
      'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorFirstChar',
      { defaultMessage: "Name can not contain a coma (',')." }
    );
  }

  return errorMsg === null ? null : { message: errorMsg };
};

export const validateLeaderIndexPattern = (_indexPatterns) => {
  let errorMsg;
  const indexPatterns = arrify(_indexPatterns);

  if (!indexPatterns.length) {
    // By calling the validator we receive the empty error message translated
    const { error } = validateIndexPattern();
    errorMsg = [error];
  } else {
    errorMsg = indexPatterns
      .map((pattern) => validateIndexPattern(pattern).error)
      .filter(error => error !== null);
  }

  return errorMsg.length ? { message: errorMsg[0] } : null;
};

export const validateFollowIndexPattern = (indexPattern, fieldName = 'prefix') => {
  // If it's empty, it is valid
  if (!indexPattern || !indexPattern.trim()) {
    return null;
  }

  const { error } = validateIndexPattern(indexPattern, fieldName);
  return error === null ? null : { message: error };
};

export const validateAutoFollowPattern = (autoFollowPattern) => {
  if (!autoFollowPattern) {
    return {
      name: validateName(),
      leaderIndexPatterns: validateLeaderIndexPattern(),
      followIndexPatternPrefix: null,
      followIndexPatternSuffix: null,
    };
  }

  const errors = {};
  let error = null;
  let propValue;

  Object.keys(autoFollowPattern).forEach((prop) => {
    propValue = autoFollowPattern[prop];
    error = null;

    switch(prop) {
      case 'name': {
        error = validateName(propValue);
        break;
      }
      case 'leaderIndexPatterns': {
        error = validateLeaderIndexPattern(propValue);

        if (Array.isArray(error)) {
          error = error.join(', ');
        }
        break;
      }
      case 'followIndexPatternPrefix': {
        error = validateFollowIndexPattern(propValue, 'prefix');
        break;
      }
      case 'followIndexPatternSuffix': {
        error = validateFollowIndexPattern(propValue, 'suffix');
        break;
      }
    }

    errors[prop] = error;
  });

  return errors;
};
