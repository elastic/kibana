/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CasesTable = () => {
  return (
    <EuiFlexGroup direction="column" justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type="visualizeApp" size="xl" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.csp.dashboard.casesTable.placeholderTitle"
            defaultMessage="Coming soon"
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
