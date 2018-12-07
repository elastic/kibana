/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import HeroGraphic from '../../images/codesearch_hero_graphic.png';

export const EmptyPlaceholder = (props: any) => {
  return (
    <EuiFlexGroup direction="column" alignItems="center">
      <EuiFlexItem>
        <EuiTitle size="l">
          <h1>Search for anything in your code...</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton fill={true}>Search Settings</EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <img src={HeroGraphic} alt="empty" style={{ marginTop: '4rem' }} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
