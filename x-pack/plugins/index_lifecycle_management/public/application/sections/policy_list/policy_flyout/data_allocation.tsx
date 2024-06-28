/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { determineDataTierAllocationType } from '../../../lib';
import { AllocateAction, MigrateAction, PhaseWithAllocation } from '../../../../../common/types';
import { i18nTexts } from '../../edit_policy/i18n_texts';

const getAllocationDescription = (
  type: ReturnType<typeof determineDataTierAllocationType>,
  phase: PhaseWithAllocation,
  allocate?: AllocateAction
) => {
  if (type === 'none') {
    return (
      <EuiText color="subdued">
        <EuiSpacer size="s" />
        {i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationDisabledLabel', {
          defaultMessage: 'Disabled',
        })}
      </EuiText>
    );
  }
  if (type === 'node_roles') {
    const label =
      phase === 'warm'
        ? i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationWarmNodesLabel', {
            defaultMessage: 'Using warm nodes',
          })
        : i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationColdNodesdLabel', {
            defaultMessage: 'Using cold nodes',
          });
    return (
      <EuiText color="subdued">
        <EuiSpacer size="s" />
        {label}{' '}
        <EuiBadge color="success">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.policyFlyout.recommendedDataAllocationLabel"
            defaultMessage="Recommended"
          />
        </EuiBadge>
      </EuiText>
    );
  }
  if (type === 'node_attrs') {
    return (
      <EuiText color="subdued">
        <EuiSpacer size="s" />
        {i18n.translate('xpack.indexLifecycleMgmt.policyFlyout.dataAllocationAttributtesLabel', {
          defaultMessage: 'Node attributes',
        })}
        {': '}
        <EuiCode>{JSON.stringify(allocate?.require)}</EuiCode>
      </EuiText>
    );
  }
};
export const DataAllocation = ({
  allocate,
  migrate,
  phase,
}: {
  allocate?: AllocateAction;
  migrate?: MigrateAction;
  phase: PhaseWithAllocation;
}) => {
  const allocationType = determineDataTierAllocationType({ allocate, migrate });
  const allocationDescription = getAllocationDescription(allocationType, phase, allocate);
  return (
    <>
      <EuiDescriptionListTitle>{i18nTexts.editPolicy.dataAllocationLabel}</EuiDescriptionListTitle>
      <EuiDescriptionListDescription>{allocationDescription}</EuiDescriptionListDescription>
    </>
  );
};
