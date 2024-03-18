/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { WaffleAccountsControls } from '../waffle/waffle_accounts_controls';
import { WaffleRegionControls } from '../waffle/waffle_region_controls';
import type { ToolbarProps } from './types';

export const CloudToolbarItems = (props: ToolbarProps) => {
  return (
    <>
      {props.accounts.length > 0 && (
        <EuiFlexItem grow={false}>
          <WaffleAccountsControls
            changeAccount={props.changeAccount}
            accountId={props.accountId}
            options={props.accounts}
          />
        </EuiFlexItem>
      )}
      {props.regions.length > 0 && (
        <EuiFlexItem grow={false}>
          <WaffleRegionControls
            changeRegion={props.changeRegion}
            region={props.region}
            options={props.regions}
          />
        </EuiFlexItem>
      )}
    </>
  );
};
