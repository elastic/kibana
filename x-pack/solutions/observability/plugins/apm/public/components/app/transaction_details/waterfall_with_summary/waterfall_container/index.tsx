/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { History } from 'history';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import { TraceWaterfall } from '../../../../shared/trace_waterfall';
import { WaterfallFlyout } from './waterfall/waterfall_flyout';
import type { IWaterfall } from './waterfall/waterfall_helpers/waterfall_helpers';
import { convertToTraceItems } from './convert_to_trace_items';

interface Props {
  waterfallItemId?: string;
  serviceName?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (value: boolean) => void;
}

const toggleFlyout = ({
  history,
  waterfallItemId,
  flyoutDetailTab,
}: {
  history: History;
  waterfallItemId?: string;
  flyoutDetailTab?: string;
}) => {
  history.replace({
    ...history.location,
    search: fromQuery({
      ...toQuery(location.search),
      flyoutDetailTab,
      waterfallItemId,
    }),
  });
};

export function WaterfallContainer({
  serviceName,
  waterfallItemId,
  waterfall,
  showCriticalPath,
  onShowCriticalPathChange,
}: Props) {
  const history = useHistory();

  const traceItems = useMemo(() => (waterfall ? convertToTraceItems(waterfall) : []), [waterfall]);
  const errors = useMemo(
    () => (waterfall ? waterfall.errorItems.map((item) => item.doc) : []),
    [waterfall]
  );
  const agentMarks = waterfall?.entryTransaction?.transaction.marks?.agent;

  if (!waterfall) {
    return null;
  }

  const handleNodeClick = (id: string) => {
    toggleFlyout({ history, waterfallItemId: id, flyoutDetailTab: 'metadata' });
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <TraceWaterfall
          traceItems={traceItems}
          errors={errors}
          onClick={handleNodeClick}
          serviceName={serviceName}
          showLegend
          showCriticalPathControl
          agentMarks={agentMarks}
          showCriticalPath={showCriticalPath}
          onShowCriticalPathChange={onShowCriticalPathChange}
        />
      </EuiFlexItem>

      <WaterfallFlyout
        waterfallItemId={waterfallItemId}
        waterfall={waterfall}
        toggleFlyout={toggleFlyout}
      />
    </EuiFlexGroup>
  );
}
