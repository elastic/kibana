/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiBadge, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SLOGroupings } from '../common/slo_groupings';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SLOCardItemInstanceBadge({ slo }: Props) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const entries = Object.entries(slo.groupings);
  const show = entries.length > 1;

  if (!show) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        isOpen={isPopoverOpen}
        button={
          <EuiBadge
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
            }}
            onClickAriaLabel={i18n.translate('xpack.slo.instances.seeAllBadge', {
              defaultMessage: 'see all instance ids',
            })}
            data-test-subj="o11ySlosSeeAllInstanceIdsBadge"
          >
            {`${i18n.translate('xpack.slo.extraInstanceIds.badge', {
              defaultMessage: '+{count, plural, one {# more instance} other {# more instances}}',
              values: {
                count: entries.length - 1,
              },
            })}`}
          </EuiBadge>
        }
      >
        <SLOGroupings slo={slo} direction="column" truncate={false} />
      </EuiPopover>
    </EuiFlexItem>
  );
}
