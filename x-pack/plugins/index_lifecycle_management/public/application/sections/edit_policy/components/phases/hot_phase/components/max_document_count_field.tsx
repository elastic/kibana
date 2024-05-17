/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { NumericField } from '../../../../../../../shared_imports';
import { ROLLOVER_FORM_PATHS } from '../../../../constants';
import { UseField } from '../../../../form';

export const MaxDocumentCountField: FunctionComponent = () => {
  return (
    <EuiFlexGroup alignItems="flexStart" gutterSize="s">
      <EuiFlexItem style={{ maxWidth: 400 }}>
        <UseField
          path={ROLLOVER_FORM_PATHS.maxDocs}
          component={NumericField}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': `hot-selectedMaxDocuments`,
              min: 1,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
