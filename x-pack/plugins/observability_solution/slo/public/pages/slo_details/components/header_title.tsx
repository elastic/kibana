/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import moment from 'moment';
import React from 'react';
import { paths } from '../../../../common/locators/paths';
import { SloRemoteBadge } from '../../slos/components/card_view/slo_remote_badge';
import { SLOGroupings } from '../../slos/components/common/slo_groupings';
import { SloStatusBadge } from '../../../components/slo/slo_status_badge';

export interface Props {
  slo: SLOWithSummaryResponse | undefined;
  isLoading: boolean;
}

export function HeaderTitle({ isLoading, slo }: Props) {
  if (isLoading || !slo) {
    return <EuiSkeletonText lines={1} data-test-subj="loadingTitle" />;
  }

  const sloDetailsUrl = slo.kibanaUrl
    ? (
        slo.kibanaUrl +
        paths.sloDetails(
          slo.id,
          ![slo.groupBy].flat().includes(ALL_VALUE) && slo.instanceId ? slo.instanceId : undefined,
          slo.remoteName
        )
      ).replace(/\/\//g, '/')
    : undefined;

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <SLOGroupings slo={slo} />

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
      <EuiSpacer size="s" />
      {slo.remoteName && (
        <EuiCallOut
          title={i18n.translate('xpack.slo.sloDetails.headerTitle.calloutMessage', {
            defaultMessage: 'Remote SLO',
          })}
        >
          <p>
            <FormattedMessage
              id="xpack.observability.slo.sloDetails.headerTitle.calloutDescription"
              defaultMessage="This is a remote SLO which belongs to another Kibana instance. it is fetched from the remote cluster: {remoteName}."
              values={{ remoteName: <strong>{slo.remoteName}</strong> }}
            />
          </p>
          <EuiButton
            data-test-subj="o11yHeaderTitleLinkButtonButton"
            href={sloDetailsUrl}
            color="primary"
            target="_blank"
          >
            {i18n.translate('xpack.slo.headerTitle.linkButtonButtonLabel', {
              defaultMessage: 'View remote SLO details',
            })}
          </EuiButton>
        </EuiCallOut>
      )}
    </EuiFlexGroup>
  );
}
