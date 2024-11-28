/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { SloStatusBadge } from '../../../components/slo/slo_status_badge';
import { SloRemoteBadge } from '../../slos/components/badges/slo_remote_badge';
import { SLOGroupings } from './groupings/slo_groupings';

export interface Props {
  slo?: SLOWithSummaryResponse;
  isLoading: boolean;
}

export function HeaderTitle({ isLoading, slo }: Props) {
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={1} data-test-subj="loadingTitle" />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
        wrap={true}
      >
        <SloStatusBadge slo={slo} />
        <SloRemoteBadge slo={slo} />
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <strong>
              {i18n.translate('xpack.slo.sloDetails.headerTitle.lastUpdatedMessage', {
                defaultMessage: 'Last updated on',
              })}
            </strong>
            &nbsp;
            {moment(slo.updatedAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <strong>
              {i18n.translate('xpack.slo.sloDetails.headerTitle.createdMessage', {
                defaultMessage: 'Created on',
              })}
            </strong>
            &nbsp;
            {moment(slo.createdAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <SLOGroupings slo={slo} />
    </EuiFlexGroup>
  );
}
