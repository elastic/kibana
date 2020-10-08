/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { indices } from '../../shared_imports';

const isEmpty = (value) => {
  return !value || !value.trim().length;
};

const hasSpaces = (value) => (typeof value === 'string' ? value.includes(' ') : false);

const beginsWithPeriod = (value) => {
  return value[0] === '.';
};

const findIllegalCharacters = (value) => {
  return indices.INDEX_ILLEGAL_CHARACTERS_VISIBLE.reduce((chars, char) => {
    if (value.includes(char)) {
      chars.push(char);
    }

    return chars;
  }, []);
};

export const indexNameValidator = (value) => {
  if (isEmpty(value)) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.nameMissingMessage"
        defaultMessage="Name is required."
      />,
    ];
  }

  if (beginsWithPeriod(value)) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.nameBeginsWithPeriodMessage"
        defaultMessage="Name can't begin with a period."
      />,
    ];
  }

  const illegalCharacters = findIllegalCharacters(value);

  if (illegalCharacters.length) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.nameIllegalCharactersMessage"
        defaultMessage="Remove the characters {characterList} from your name."
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />,
    ];
  }

  if (hasSpaces(value)) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndex.indexNameValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the name."
      />,
    ];
  }

  return undefined;
};

export const leaderIndexValidator = (value) => {
  if (isEmpty(value)) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.leaderIndexMissingMessage"
        defaultMessage="Leader index is required."
      />,
    ];
  }

  const illegalCharacters = findIllegalCharacters(value);

  if (illegalCharacters.length) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.leaderIndexIllegalCharactersMessage"
        defaultMessage="Remove the characters {characterList} from your leader index."
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />,
    ];
  }

  if (hasSpaces(value)) {
    return [
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndex.leaderIndexValidation.noEmptySpace"
        defaultMessage="Spaces are not allowed in the leader index."
      />,
    ];
  }

  return undefined;
};
