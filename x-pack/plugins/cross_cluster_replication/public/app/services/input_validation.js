/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

const isEmpty = value => {
  return !value || !value.trim().length;
};

const beginsWithPeriod = value => {
  return value[0] === '.';
};

const findIllegalCharacters = value => {
  return INDEX_ILLEGAL_CHARACTERS_VISIBLE.reduce((chars, char) => {
    if (value.includes(char)) {
      chars.push(char);
    }

    return chars;
  }, []);
};

export const indexNameValidator = (value) => {
  if (isEmpty(value)) {
    return [(
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.nameMissing"
        defaultMessage="Name is required."
      />
    )];
  }

  if (beginsWithPeriod(value)) {
    return [(
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.nameBeginsWithPeriod"
        defaultMessage="Name can't begin with a period."
      />
    )];
  }

  const illegalCharacters = findIllegalCharacters(value);

  if (illegalCharacters.length) {
    return [(
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.nameIllegalCharacters"
        defaultMessage="Remove the characters {characterList} from your name."
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />
    )];
  }

  return undefined;
};

export const leaderIndexValidator = (value) => {
  if (isEmpty(value)) {
    return [(
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.leaderIndexMissing"
        defaultMessage="Leader index is required."
      />
    )];
  }

  const illegalCharacters = findIllegalCharacters(value);

  if (illegalCharacters.length) {
    return [(
      <FormattedMessage
        id="xpack.crossClusterReplication.followerIndexForm.errors.leaderIndexIllegalCharacters"
        defaultMessage="Remove the characters {characterList} from your leader index."
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />
    )];
  }

  return undefined;
};
