/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Error } from '@kbn/apm-types';
import type { History } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import { TraceWaterfall } from '../../../../shared/trace_waterfall';
import { UnifiedWaterfallFlyout } from './waterfall/unified_waterfall_flyout';

interface Props {
  traceItems: TraceItem[];
  errors: Error[];
  agentMarks: Record<string, number>;
  waterfallItemId?: string;
  serviceName?: string;
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
      ...toQuery(history.location.search),
      flyoutDetailTab,
      waterfallItemId,
    }),
  });
};

export function UnifiedWaterfallContainer({
  traceItems,
  errors,
  agentMarks,
  serviceName,
  waterfallItemId,
  showCriticalPath,
  onShowCriticalPathChange,
}: Props) {
  const history = useHistory();

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
        >
          <UnifiedWaterfallFlyout
            waterfallItemId={waterfallItemId}
            traceItems={traceItems}
            toggleFlyout={toggleFlyout}
          />
        </TraceWaterfall>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
