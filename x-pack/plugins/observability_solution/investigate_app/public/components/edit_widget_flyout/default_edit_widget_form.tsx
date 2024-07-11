/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { InvestigateWidget } from '@kbn/investigate-plugin/common';
import { EuiFlexGroup } from '@elastic/eui';
import { InvestigateSearchBar } from '../investigate_search_bar';

export function DefaultEditWidgetForm({
  widget,
  onWidgetUpdate,
}: {
  widget: InvestigateWidget;
  onWidgetUpdate: (update: InvestigateWidget) => void;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <InvestigateSearchBar
        kuery={widget.parameters.query.query}
        rangeFrom={widget.parameters.timeRange.from}
        rangeTo={widget.parameters.timeRange.to}
        onQuerySubmit={() => {}}
        onQueryChange={({ kuery: nextKuery, dateRange: nextDateRange }) => {
          onWidgetUpdate({
            ...widget,
            parameters: {
              ...widget.parameters,
              query: {
                language: 'kuery',
                query: nextKuery,
              },
              timeRange: {
                from: nextDateRange.from,
                to: nextDateRange.to,
              },
            },
            locked: true,
          });
        }}
        showSubmitButton={false}
      />
    </EuiFlexGroup>
  );
}
