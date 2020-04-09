/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../../../public/components/inventory/toolbars/toolbar';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleAccountsControls } from '../../../../public/components/waffle/waffle_accounts_controls';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleRegionControls } from '../../../../public/components/waffle/waffle_region_controls';

type Props = ToolbarProps;

export const CloudToolbarItems = (props: Props) => {
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
