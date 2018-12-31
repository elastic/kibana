/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  indexNameBeginsWithPeriod,
  findIllegalCharactersInIndexName,
  indexNameContainsSpaces,
} from 'ui/indices';

const i18nLabels = {
  indexName: i18n.translate(
    'xpack.crossClusterReplication.followerIndex.indexName',
    { defaultMessage: 'Name' }
  ),
  leaderIndex: i18n.translate(
    'xpack.crossClusterReplication.followerIndex.leaderIndex',
    { defaultMessage: 'Leader index' }
  )
};

const validateIndexName = (name, fieldName) => {
  if (!name || !name.trim()) {
    // Empty
    return {
      message: i18n.translate(
        'xpack.crossClusterReplication.followerIndex.indexNameValidation.errorEmpty',
        {
          defaultMessage: '{name} is required.',
          values: { name: fieldName }
        }
      )
    };
  } else {
    // Indices can't begin with a period, because that's reserved for system indices.
    if (indexNameBeginsWithPeriod(name)) {
      return {
        message: i18n.translate('xpack.crossClusterReplication.followerIndex.indexNameValidation.beginsWithPeriod', {
          defaultMessage: `The {name} can't begin with a period.`,
          values: { name: fieldName.toLowerCase() }
        })
      };
    }

    const illegalCharacters = findIllegalCharactersInIndexName(name);

    if (illegalCharacters.length) {
      return {
        message: <FormattedMessage
          id="xpack.crossClusterReplication.followerIndex.indexNameValidation.illegalCharacters"
          defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}} {characterList} from the {name}."
          values={{
            name: fieldName.toLowerCase(),
            characterList: <strong>{illegalCharacters.join(' ')}</strong>,
            characterListLength: illegalCharacters.length,
          }}
        />
      };
    }

    if (indexNameContainsSpaces(name)) {
      return {
        message: i18n.translate('xpack.crossClusterReplication.followerIndex.indexNameValidation.noEmptySpace', {
          defaultMessage: `Spaces are not allowed in the {name}.`,
          values: { name: fieldName.toLowerCase() }
        })
      };
    }

    return null;
  }
};

export const validateFollowerIndex = (followerIndex) => {
  const errors = {};
  let error = null;
  let fieldValue;

  Object.keys(followerIndex).forEach((fieldName) => {
    fieldValue = followerIndex[fieldName];
    error = null;
    switch (fieldName) {
      case 'name':
        error = validateIndexName(fieldValue, i18nLabels.indexName);
        break;
      case 'leaderIndex':
        error = validateIndexName(fieldValue, i18nLabels.leaderIndex);
        break;
    }
    errors[fieldName] = error;
  });

  return errors;
};
