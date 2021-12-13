/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { UseTraceQueryState } from '../../../../hooks/use_trace_query';
import { TraceOperations } from './trace_operations';
import { TraceSamples } from './trace_samples';

enum TraceComparisonTabType {
  traceSamples = 'traceSamples',
  operations = 'operations',
}

export function TraceComparison({
  foreground,
  background,
}: {
  foreground: UseTraceQueryState;
  background: UseTraceQueryState;
}) {
  const tabs = [
    {
      id: TraceComparisonTabType.traceSamples,
      title: i18n.translate('xpack.apm.traceComparison.traceSamplesTab', {
        defaultMessage: 'Trace samples',
      }),
      content: <TraceSamples background={background} foreground={foreground} />,
    },
    {
      id: TraceComparisonTabType.operations,
      title: i18n.translate('xpack.apm.traceComparison.operationsTab', {
        defaultMessage: 'Operations',
      }),
      content: (
        <TraceOperations background={background} foreground={foreground} />
      ),
    },
  ];

  const [selectedTab, setSelectedTab] = useState(
    TraceComparisonTabType.traceSamples
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiTabs size="m">
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={selectedTab === tab.id}
              onClick={() => {
                setSelectedTab(tab.id);
              }}
            >
              {tab.title}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem>
        {tabs.find((tab) => tab.id === selectedTab)!.content}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
