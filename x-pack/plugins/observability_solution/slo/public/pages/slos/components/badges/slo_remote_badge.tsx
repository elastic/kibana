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
import { createRemoteSloDetailsUrl } from '../../../../utils/slo/remote_slo_urls';

export function SloRemoteBadgeWithoutRouterContext({
  remote,
  ...rest
}: {
  remote: Required<SLOWithSummaryResponse>['remote'];
  href: string;
} & (
  | {}
  | {
      onClick: (e: React.MouseEvent<HTMLElement>) => void;
    }
)) {
  const interactivityProps =
    'onClick' in rest
      ? {
          onClick: rest.onClick,
          iconOnClick: rest.onClick,
          iconOnClickAriaLabel: '',
          onClickAriaLabel: '',
          // make sure EuiBadge's types don't complain about passing
          // both href and onClick
          href: rest.href as unknown as undefined,
        }
      : {
          href: rest.href,
          target: '_blank',
          onMouseDown: (e: MouseEvent) => {
            e.stopPropagation();
          },
        };

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={remote.kibanaUrl} title={remote.remoteName}>
        <EuiBadge color="default" {...interactivityProps}>
          {i18n.translate('xpack.slo.sloCardItemBadges.remoteBadgeLabel', {
            defaultMessage: 'Remote',
          })}
        </EuiBadge>
      </EuiToolTip>
    </EuiFlexItem>
  );
}

export function SloRemoteBadge({ slo }: { slo: SLOWithSummaryResponse }) {
  const spaceId = useSpace();

  if (!slo.remote) {
    return null;
  }

  const sloDetailsUrl = createRemoteSloDetailsUrl(slo, spaceId);
  return <SloRemoteBadgeWithoutRouterContext href={sloDetailsUrl!} remote={slo.remote} />;
}
