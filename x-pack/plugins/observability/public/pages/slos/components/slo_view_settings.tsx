/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitch } from '@elastic/eui';

export const SLO_LIST_IS_COMPACT = 'slo-list-is-compact';

export function SLOViewSettings({
  toggleCompactView,
  isCompact,
}: {
  toggleCompactView: () => void;
  isCompact: boolean;
}) {
  return (
    <EuiSwitch
      label={
        <FormattedMessage
          id="xpack.observability.slo.listView.compactViewLabel"
          defaultMessage="Compact view"
        />
      }
      id="sloListCompactToggle"
      checked={isCompact}
      onChange={toggleCompactView}
      compressed
    />
  );
}
