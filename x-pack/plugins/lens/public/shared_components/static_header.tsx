/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, IconType } from '@elastic/eui';

export const StaticHeader = ({ label, icon }: { label: string; icon?: IconType }) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      className={'lnsLayerPanel__settingsStaticHeader'}
    >
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />{' '}
        </EuiFlexItem>
      )}
      <EuiFlexItem grow>
        <EuiTitle size="xxs">
          <h5>{label}</h5>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
