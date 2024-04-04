/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { MouseEvent } from 'react';
import { useSpace } from '../../../../hooks/use_space';
import { createRemoteSloDetailsUrl } from '../../../../utils/slo/create_remote_slo_details_url';

export function SloRemoteBadge({ slo }: { slo: SLOWithSummaryResponse }) {
  const spaceId = useSpace();
  if (!slo.remote) {
    return null;
  }

  const sloDetailsUrl = createRemoteSloDetailsUrl(slo, spaceId);
  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={slo.remote.kibanaUrl} title={slo.remote.remoteName}>
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
  );
}
