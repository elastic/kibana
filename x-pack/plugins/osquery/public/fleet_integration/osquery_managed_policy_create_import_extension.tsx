/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { produce } from 'immer';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCard,
  EuiIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { PackagePolicyCreateExtensionComponentProps } from '../../../fleet/public';
import { ScheduledQueryQueriesTable } from '../scheduled_queries/scheduled_query_queries_table';
import { useKibana } from '../common/lib/kibana';

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const OsqueryManagedPolicyCreateImportExtension = React.memo<PackagePolicyCreateExtensionComponentProps>(
  ({ onChange, newPolicy }) => {
    const {
      application: { navigateToApp },
    } = useKibana().services;
    const [policyType, setPolicyType] = useState('live_query');

    const detailsClicked = useCallback((e) => {
      e.stopPropagation();
    }, []);

    const handleSetPolicyType = useCallback(
      (newPolicyType) => {
        setPolicyType((currentPolicyType) => {
          if (currentPolicyType === newPolicyType) return currentPolicyType;

          if (newPolicyType === 'live_query') {
            const updatedPolicy = produce(newPolicy, (draft) => {
              draft.inputs[0].streams = [];
              return draft;
            });

            onChange({
              isValid: true,
              updatedPolicy,
            });
          }

          if (newPolicyType === 'scheduled_query') {
            navigateToApp('osquery', { path: 'scheduled_queries/new' });
          }

          return newPolicyType;
        });
      },
      [navigateToApp, newPolicy, onChange]
    );

    const liveQuerySelectable = useMemo(
      () => ({
        onClick: () => handleSetPolicyType('live_query'),
        isSelected: policyType === 'live_query',
      }),
      [handleSetPolicyType, policyType]
    );

    const scheduledQuerySelectable = useMemo(
      () => ({
        onClick: () => handleSetPolicyType('scheduled_query'),
        isSelected: policyType === 'scheduled_query',
      }),
      [handleSetPolicyType, policyType]
    );

    return (
      <>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xl" type="console" />}
              title="Live query only"
              description="This option will deploy Osquery to the agents, so you can issue live queries"
              footer={
                <EuiButtonEmpty
                  iconType="iInCircle"
                  size="xs"
                  onClick={detailsClicked}
                  aria-label="See more details about Osquery live queries"
                >
                  {'More details'}
                </EuiButtonEmpty>
              }
              selectable={liveQuerySelectable}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              icon={<EuiIcon size="xl" type="clock" />}
              title="Full integration"
              description="This option will deploy Osquery to the agents and allow to schedule queries"
              footer={
                <EuiButtonEmpty
                  iconType="iInCircle"
                  size="xs"
                  onClick={detailsClicked}
                  aria-label="See more details about Scheduled queries"
                >
                  More details
                </EuiButtonEmpty>
              }
              selectable={scheduledQuerySelectable}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />

        {policyType === 'scheduled_query' && newPolicy.inputs[0].streams.length ? (
          <EuiFlexGroup>
            <EuiFlexItem>
              {
                // @ts-expect-error update types
                <ScheduledQueryQueriesTable data={newPolicy} handleChange={onChange} />
              }
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </>
    );
  }
);
OsqueryManagedPolicyCreateImportExtension.displayName = 'OsqueryManagedPolicyCreateImportExtension';
