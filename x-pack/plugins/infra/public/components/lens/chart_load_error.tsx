/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export const ChartLoadError = () => {
  return (
    <EuiFlexGroup
      css={css`
        height: 100%;
        align-content: center;
      `}
      gutterSize="xs"
      justifyContent="center"
      alignItems="center"
      direction="column"
    >
      <EuiFlexItem grow={false}>
        <EuiIcon type="warning" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" textAlign="center">
          <FormattedMessage
            id="xpack.infra.errorOnLoadingLensDependencies"
            defaultMessage="There was an error trying to load Lens Plugin."
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
