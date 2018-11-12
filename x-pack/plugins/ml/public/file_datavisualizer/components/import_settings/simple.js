/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiFieldText,
  EuiFormRow,
  EuiCheckbox,
} from '@elastic/eui';

export function SimpleSettings({
  index,
  initialized,
  onIndexChange,
  createIndexPattern,
  onCreateIndexPatternChange,
  indexNameError,
}) {
  return (
    <React.Fragment>
      <EuiFormRow
        label="Index name"
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder="index name"
          value={index}
          disabled={(initialized === true)}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
        />
      </EuiFormRow>

      <EuiCheckbox
        id="createIndexPattern"
        label="Create index pattern"
        checked={(createIndexPattern === true)}
        disabled={(initialized === true)}
        onChange={onCreateIndexPatternChange}
      />
    </React.Fragment>
  );
}
