/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '../../../../../common/locators/paths';

export function SloRemoteBadge({ slo }: { slo: SLOWithSummaryResponse }) {
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

  return slo.remoteName ? (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={slo.kibanaUrl} title={slo.remoteName}>
        <EuiBadge
          color="default"
          href={sloDetailsUrl!}
          target="_blank"
          onMouseDown={(e: MouseEvent) => {
            e.stopPropagation();
          }}
        >
          {i18n.translate('xpack.slo.sloCardItemBadges.remoteBadgeLabel', {
            defaultMessage: 'Remote',
          })}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  ) : null;
}
