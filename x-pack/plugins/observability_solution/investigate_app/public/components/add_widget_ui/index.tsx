/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AuthenticatedUser } from '@kbn/core/public';
import type {
  GlobalWidgetParameters,
  InvestigateWidgetCreate,
  InvestigationRevision,
  OnWidgetAdd,
} from '@kbn/investigate-plugin/public';
import { assertNever } from '@kbn/std';
import { Moment } from 'moment';
import React, { useState } from 'react';
import { AddWidgetMode } from '../../constants/add_widget_mode';
import { EsqlWidgetControl } from '../esql_widget_control';
import { NoteWidgetControl } from '../note_widget_control';

type AddWidgetUIProps = {
  user: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  onWidgetAdd: OnWidgetAdd;
  revision: InvestigationRevision;
  start: Moment;
  end: Moment;
} & GlobalWidgetParameters;

function getControlsForMode({
  user,
  mode,
  onWidgetAdd,
  revision,
  start,
  end,
  query,
  timeRange,
  filters,
}: {
  user: Pick<AuthenticatedUser, 'full_name' | 'username'>;
  mode: AddWidgetMode;
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
  revision: InvestigationRevision;
  start: Moment;
  end: Moment;
} & GlobalWidgetParameters) {
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

    case AddWidgetMode.Note:
      return <NoteWidgetControl user={user} onWidgetAdd={onWidgetAdd} />;

    default:
      assertNever(mode);
  }
}

export function AddWidgetUI({
  user,
  onWidgetAdd,
  revision,
  start,
  end,
  query,
  filters,
  timeRange,
}: AddWidgetUIProps) {
  const [mode] = useState(AddWidgetMode.Note);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        {getControlsForMode({
          mode,
          onWidgetAdd,
          revision,
          start,
          end,
          query,
          filters,
          timeRange,
          user,
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
