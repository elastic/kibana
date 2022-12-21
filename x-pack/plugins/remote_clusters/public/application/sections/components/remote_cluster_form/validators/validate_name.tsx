/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export function validateName(name?: string | null): null | JSX.Element {
  if (!name || !name.trim()) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.form.errors.nameMissing"
        defaultMessage="Name is required."
      />
    );
  }

  if (name.includes(' ')) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.form.errors.illegalSpace"
        defaultMessage="Spaces are not allowed in the name."
      />
    );
  }

  const illegalCharacters = name.match(/[^a-zA-Z\d\-_]/g);
  if (illegalCharacters) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.form.errors.illegalCharacters"
        defaultMessage="Remove the {characterListLength, plural, one {character} other {characters}}
          {characterList} from the name."
        values={{
          characterList: <strong>{illegalCharacters.join(' ')}</strong>,
          characterListLength: illegalCharacters.length,
        }}
      />
    );
  }

  return null;
}
