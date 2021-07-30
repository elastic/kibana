/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiPortal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { useGetOutputs } from '../../../hooks';
import { DefaultLayout } from '../../../layouts';
import { SearchBar } from '../../../components';

import { AddOutputFlyout } from './components/add_output_flyout';

export const OutputsListPage = () => {
  const outputs = useGetOutputs();
  const [isAddOutputFlyoutOpen, setIsAddOutputFlyoutOpen] = useState(false);

  const columns = useMemo(() => {
    return [
      {
        field: 'name',
        sortable: true,
        name: i18n.translate('xpack.fleet.outputsList.outputsTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
      },
      {
        field: 'type',
        sortable: true,
        name: i18n.translate('xpack.fleet.outputsList.outputsTable.typeColumnTitle', {
          defaultMessage: 'Type',
        }),
      },
    ];
  }, []);

  return (
    <DefaultLayout section="outputs" rightColumn={undefined}>
      <EuiPortal>
        {isAddOutputFlyoutOpen && (
          <AddOutputFlyout onClose={() => setIsAddOutputFlyoutOpen(false)} />
        )}
      </EuiPortal>
      <EuiFlexGroup alignItems={'center'} gutterSize="m">
        <EuiFlexItem grow={4}>
          <SearchBar
            value={''}
            onChange={(newSearch) => {}}
            fieldPrefix={'AGENT_POLICY_SAVED_OBJECT_TYPE'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="primary" iconType="refresh" onClick={() => {}}>
            <FormattedMessage
              id="xpack.fleet.agentPolicyList.reloadAgentPoliciesButtonText"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton iconType="plusInCircle" fill onClick={() => setIsAddOutputFlyoutOpen(true)}>
            Add an output
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiInMemoryTable items={outputs.data?.items || []} columns={columns} />
    </DefaultLayout>
  );
};
