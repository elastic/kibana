/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiTextAlign, EuiTitle } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import * as i18n from './translations';

export const Welcome = pure(() => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiTextAlign textAlign="center">
        <EuiTitle size="l">
          <h1>{i18n.OVERVIEW_TITLE}</h1>
        </EuiTitle>
        <EuiText>
          <p>{i18n.OVERVIEW_SUBTITLE}</p>
        </EuiText>
      </EuiTextAlign>
    </EuiFlexItem>
  </EuiFlexGroup>
));
