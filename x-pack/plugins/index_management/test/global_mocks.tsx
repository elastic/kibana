/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// NOTE: Import this file for its side-effects. You must import it before the code that it mocks
// is imported. Typically this means just importing above your other imports.
// See https://jestjs.io/docs/manual-mocks for more info.

jest.mock('@kbn/es-ui-shared-plugin/public', () => {
  const original = jest.requireActual('@kbn/es-ui-shared-plugin/public');

  return {
    ...original,
    EuiCodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(syntheticEvent: any) => {
          props.onChange(syntheticEvent.jsonString);
        }}
      />
    ),
  };
});
