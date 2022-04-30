/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Output } from '../../../../types';

export const DefaultBadges = React.memo<{
  output: Pick<Output, 'is_default' | 'is_default_monitoring'>;
}>(({ output }) => {
  const badges = useMemo(() => {
    const badgesArray = [];
    if (output.is_default) {
      badgesArray.push(<DefaultOutputBadge key="default-output" />);
    }
    if (output.is_default_monitoring) {
      badgesArray.push(<DefaultMonitoringOutputBadge key="default-monitoring-output" />);
    }

    return badgesArray;
  }, [output]);
  return <EuiBadgeGroup gutterSize="xs">{badges.map((badge, idx) => badge)}</EuiBadgeGroup>;
});

export const DefaultOutputBadge = () => (
  <EuiBadge>
    <FormattedMessage
      id="xpack.fleet.settings.outputs.defaultOutputBadgeTitle"
      defaultMessage="Agent integrations"
    />
  </EuiBadge>
);

export const DefaultMonitoringOutputBadge = () => (
  <EuiBadge>
    <FormattedMessage
      id="xpack.fleet.settings.outputs.defaultMonitoringOutputBadgeTitle"
      defaultMessage="Agent monitoring"
    />
  </EuiBadge>
);
