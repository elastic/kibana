import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { push } from '../../../shared/links/url_helpers';
import { MobileErrorTabIds, Tabs } from './tabs/tabs';

export function MobileErrorCrashesOverview() {
  const {
    query: { mobileErrorTabId = MobileErrorTabIds.ERRORS },
  } = useApmParams('/mobile-services/{serviceName}/errors-and-crashes');
  const history = useHistory();
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <Tabs
          onTabClick={(nextTab) => {
            push(history, {
              query: {
                mobileErrorTabId: nextTab,
              },
            });
          }}
          mobileErrorTabId={mobileErrorTabId as MobileErrorTabIds}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
