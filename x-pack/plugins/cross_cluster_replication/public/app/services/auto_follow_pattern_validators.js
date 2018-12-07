/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  ILLEGAL_CHARACTERS,
  CONTAINS_SPACES,
  validateIndexPattern as getIndexPatternErrors,
} from 'ui/index_patterns';

export const validateName = (name = '') => {
  let errorMsg = null;

  if (!name || !name.trim()) {
    errorMsg = i18n.translate(
      'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorEmptyName',
      { defaultMessage: 'Name is required.' }
    );
  } else {
    if (name.includes(' ')) {
      errorMsg = i18n.translate('xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorSpace', {
        defaultMessage: 'Spaces are not allowed in the name.'
      });
    }

    if (name[0] === '_') {
      errorMsg = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorFirstChar',
        { defaultMessage: "Name can't begin with an underscore." }
      );
    }

    if (name.includes(',')) {
      errorMsg = i18n.translate(
        'xpack.crossClusterReplication.autoFollowPattern.nameValidation.errorFirstChar',
        { defaultMessage: "Commas are not allowed in the name." }
      );
    }
  }

  return errorMsg;
};

export const validateLeaderIndexPattern = (indexPattern) => {
  const errors = getIndexPatternErrors(indexPattern);

  if (errors[ILLEGAL_CHARACTERS]) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.illegalCharacters"
        defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}}
          {characterList} from the index pattern."
        values={{
          characterList: <strong>{errors[ILLEGAL_CHARACTERS].join(' ')}</strong>,
          characterListLength: errors[ILLEGAL_CHARACTERS].length,
        }}
      />
    );
  }

  if (errors[CONTAINS_SPACES]) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the index pattern."
      />
    );
  }

  return null;
};

export const validatePrefix = (prefix) => {
  // If it's empty, it is valid
  if (!prefix || !prefix.trim()) {
    return null;
  }

  const errors = getIndexPatternErrors(prefix);

  if (errors[ILLEGAL_CHARACTERS]) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.prefixValidation.illegalCharacters"
        defaultMessage="Remove the characters {characterList} from the prefix."
        values={{ characterList: <strong>{errors[ILLEGAL_CHARACTERS].join(' ')}</strong> }}
      />
    );
  }

  if (errors[CONTAINS_SPACES]) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.prefixValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the prefix."
      />
    );
  }

  return null;
};

export const validateSuffix = (suffix) => {
  // If it's empty, it is valid
  if (!suffix || !suffix.trim()) {
    return null;
  }

  const errors = getIndexPatternErrors(suffix);

  if (errors[ILLEGAL_CHARACTERS]) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.illegalCharacters"
        defaultMessage="Remove the characters {characterList} from the suffix."
        values={{ characterList: <strong>{errors[ILLEGAL_CHARACTERS].join(' ')}</strong> }}
      />
    );
  }

  if (errors[CONTAINS_SPACES]) {
    return (
      <FormattedMessage
        id="xpack.crossClusterReplication.autoFollowPattern.suffixValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the suffix."
      />
    );
  }

  return null;
};

export const validateAutoFollowPattern = (autoFollowPattern = {}) => {
  const errors = {};
  let error = null;
  let fieldValue;

  Object.keys(autoFollowPattern).forEach((fieldName) => {
    fieldValue = autoFollowPattern[fieldName];
    error = null;

    switch(fieldName) {
      case 'name':
        error = validateName(fieldValue);
        break;

      case 'leaderIndexPatterns':
        if (!fieldValue.length) {
          error = i18n.translate('xpack.crossClusterReplication.autoFollowPattern.leaderIndexPatternValidation.isEmpty', {
            defaultMessage: 'At least one leader index pattern is required.',
          });
        }
        break;

      case 'followIndexPatternPrefix':
        error = validatePrefix(fieldValue);
        break;

      case 'followIndexPatternSuffix':
        error = validateSuffix(fieldValue);
        break;
    }

    errors[fieldName] = error;
  });

  return errors;
};
