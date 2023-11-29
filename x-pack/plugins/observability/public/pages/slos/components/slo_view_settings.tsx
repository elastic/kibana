/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitch } from '@elastic/eui';

export const SLO_LIST_VIEW_MODE = 'slo-list-view-mode';

export function SLOViewSettings({
  toggleCompactView,
  listViewMode,
}: {
  toggleCompactView: () => void;
  listViewMode: 'compact' | 'default';
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
      checked={listViewMode === 'compact'}
      onChange={toggleCompactView}
      compressed
    />
  );
}
