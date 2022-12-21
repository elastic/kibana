/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { indices } from '../../../../shared_imports';

export function validateRollupIndex(rollupIndex, indexPattern) {
  if (!rollupIndex || !rollupIndex.trim()) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexMissing"
        defaultMessage="Rollup index is required."
      />,
    ];
  }

  if (rollupIndex === indexPattern) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexSameAsIndexPattern"
        defaultMessage="Rollup index cannot have the same as the index pattern."
      />,
    ];
  }

  const illegalCharacters = indices.findIllegalCharactersInIndexName(rollupIndex);

  if (illegalCharacters.length) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexIllegalCharacters"
        defaultMessage="Remove the characters {characterList} from your rollup index name."
        values={{ characterList: <strong>{illegalCharacters.join(' ')}</strong> }}
      />,
    ];
  }

  if (rollupIndex.includes(',')) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexCommas"
        defaultMessage="Remove the commas from your rollup index name."
      />,
    ];
  }

  if (rollupIndex.includes(' ')) {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexSpaces"
        defaultMessage="Remove the spaces from your rollup index name."
      />,
    ];
  }

  if (rollupIndex[0] === '.') {
    return [
      <FormattedMessage
        id="xpack.rollupJobs.create.errors.rollupIndexBeginningPeriod"
        defaultMessage="Index names cannot begin with periods."
      />,
    ];
  }

  return undefined;
}
