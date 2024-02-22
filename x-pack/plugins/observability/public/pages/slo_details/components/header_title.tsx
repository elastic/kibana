/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { SLOGroupings } from '../../slos/components/common/slo_groupings';
import { SloStatusBadge } from '../../../components/slo/slo_status_badge';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
  showTitle?: boolean;
}

export function HeaderTitle(props: Props) {
  const { isLoading, slo, showTitle = true } = props;

  if (isLoading) {
    return <EuiLoadingSpinner data-test-subj="loadingTitle" />;
  }

  if (!slo) {
    return null;
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="xs">
        {showTitle && (
          <>
            <EuiFlexItem grow={false}>{slo.name}</EuiFlexItem>
            <SLOGroupings slo={slo} />
          </>
        )}

        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
        >
          <SloStatusBadge slo={slo} />
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="xs">
            <strong>
              {i18n.translate('xpack.observability.slo.sloDetails.headerTitle.lastUpdatedMessage', {
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
              {i18n.translate('xpack.observability.slo.sloDetails.headerTitle.createdMessage', {
                defaultMessage: 'Created on',
              })}
            </strong>
            &nbsp;
            {moment(slo.createdAt).format('ll')}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
