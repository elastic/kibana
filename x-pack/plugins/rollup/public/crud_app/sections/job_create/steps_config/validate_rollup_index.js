/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

export function validateRollupIndex(rollupIndex, indexPattern) {
  if (!rollupIndex || !rollupIndex.trim()) {
    return [(
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexMissing"
        defaultMessage="You must provide a rollup index"
      />
    )];
  }

  if (rollupIndex === indexPattern) {
    return [(
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexSameAsIndexPattern"
        defaultMessage="Rollup index must not be the same as the index pattern"
      />
    )];
  }

  const illegalCharacters = INDEX_ILLEGAL_CHARACTERS_VISIBLE.reduce((chars, char) => {
    if (rollupIndex.includes(char)) {
      chars.push(char);
    }

    return chars;
  }, []);

  if (illegalCharacters.length) {
    return [(
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexIllegalCharacters"
        defaultMessage="You must remove these characters from your rollup index name: {characterList}"
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />
    )];
  }

  if (rollupIndex.includes(',')) {
    return [(
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexCommas"
        defaultMessage="You must remove commas from your rollup index name"
      />
    )];
  }

  if (rollupIndex.includes(' ')) {
    return [(
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexSpaces"
        defaultMessage="You must remove spaces from your rollup index name"
      />
    )];
  }

  if (rollupIndex[0] === '.') {
    return [(
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexSpaces"
        defaultMessage="Index names can't begin with periods"
      />
    )];
  }

  return undefined;
}
