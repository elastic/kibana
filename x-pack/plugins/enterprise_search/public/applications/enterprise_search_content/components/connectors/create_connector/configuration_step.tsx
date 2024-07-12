/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// import { useLocation } from 'react-router-dom';

import { css } from '@emotion/react';
// import { useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';

interface ConfigurationStepProps {
  title: string;
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({ title }) => {
  return (
    <>
      <EuiFlexGroup gutterSize="m" direction="column">
        {/* Configuration */}
        <EuiFlexItem>
          <EuiPanel hasShadow={false} hasBorder paddingSize="l">
            <EuiTitle size="m">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
