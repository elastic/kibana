/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { InvestigateTimeline, InvestigateWidgetCreate } from '@kbn/investigate-plugin/public';
import { Moment } from 'moment';
import React, { useState } from 'react';
import { Filter, Query } from '@kbn/es-query';
import { AddWidgetMode } from '../../constants/add_widget_mode';
import { AddFromLibraryButton } from '../add_from_library_button';
import { AddWidgetModeSelector } from '../add_widget_mode_selector';
import { AddWidgetQuickLinks } from '../add_widget_quick_links';
import { AssistantWidgetControl } from '../assistant_widget_control';
// import { CreateVisualizationButton } from '../create_visualization_button';
import { EsqlWidgetControl } from '../esql_widget_control';
import { NoteWidgetControl } from '../note_widget_control';

interface AddWidgetUIProps {
  user: {
    name: string;
  };
  assistantAvailable: boolean;
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
  timeline: InvestigateTimeline;
  start: Moment;
  end: Moment;
  query: Query;
  timeRange: {
    from: string;
    to: string;
  };
  filters: Filter[];
}

function getControlsForMode({
  user,
  mode,
  onWidgetAdd,
  timeline,
  start,
  end,
  query,
  timeRange,
  filters,
}: {
  user: { name: string };
  mode: AddWidgetMode;
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
  timeline: InvestigateTimeline;
  start: Moment;
  end: Moment;
  query: Query;
  timeRange: {
    from: string;
    to: string;
  };
  filters: Filter[];
}) {
  switch (mode) {
    case AddWidgetMode.Esql:
      return (
        <EsqlWidgetControl
          onWidgetAdd={onWidgetAdd}
          timeRange={timeRange}
          query={query}
          filters={filters}
        />
      );

    case AddWidgetMode.Assistant:
      return (
        <AssistantWidgetControl
          onWidgetAdd={onWidgetAdd}
          timeline={timeline}
          start={start}
          end={end}
        />
      );

    case AddWidgetMode.Note:
      return <NoteWidgetControl user={user} onWidgetAdd={onWidgetAdd} />;
  }
}

export function AddWidgetUI({
  user,
  assistantAvailable,
  onWidgetAdd,
  timeline,
  start,
  end,
  query,
  filters,
  timeRange,
}: AddWidgetUIProps) {
  const [mode, setMode] = useState(AddWidgetMode.Assistant);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {timeline.items.length === 0 ? (
        <EuiFlexItem grow={false}>
          <AddWidgetQuickLinks onWidgetAdd={onWidgetAdd} start={start} end={end} />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        {getControlsForMode({
          mode,
          onWidgetAdd,
          timeline,
          start,
          end,
          query,
          filters,
          timeRange,
          user,
        })}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <AddWidgetModeSelector
              mode={mode}
              onModeSelect={(nextMode) => {
                setMode(() => nextMode);
              }}
              assistantAvailable={assistantAvailable}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AddFromLibraryButton onWidgetAdd={onWidgetAdd} />
          </EuiFlexItem>
          {/* <EuiFlexItem grow={false}>
            <CreateVisualizationButton onWidgetAdd={onWidgetAdd} />
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
