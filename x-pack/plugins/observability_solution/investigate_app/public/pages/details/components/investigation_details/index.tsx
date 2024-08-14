/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import datemath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { keyBy, noop } from 'lodash';
import React, { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { AddObservationUI } from '../../../../components/add_observation_ui';
import { InvestigateSearchBar } from '../../../../components/investigate_search_bar';
import { InvestigateWidgetGrid } from '../../../../components/investigate_widget_grid';
import { useAddInvestigationNote } from '../../../../hooks/use_add_investigation_note';
import { useDateRange } from '../../../../hooks/use_date_range';
import { useFetchInvestigation } from '../../../../hooks/use_fetch_investigation';
import { useKibana } from '../../../../hooks/use_kibana';
import { InvestigationNotes } from '../investigation_notes/investigation_notes';

function InvestigationDetailsWithUser({
  user,
  investigationId,
}: {
  user: AuthenticatedUser;
  investigationId: string;
}) {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();
  const widgetDefinitions = investigate.getWidgetDefinitions();
  const [range, setRange] = useDateRange();

  const { data: investigationData } = useFetchInvestigation({ id: investigationId });
  const { mutateAsync: addInvestigationNote } = useAddInvestigationNote();
  const handleAddInvestigationNote = async (note: string) => {
    await addInvestigationNote({ investigationId, note: { content: note } });
    // todo: move following to mutate hook
    await addNote(note);
  };

  const {
    addItem,
    copyItem,
    deleteItem,
    investigation,
    setGlobalParameters,
    renderableInvestigation,
    addNote,
    deleteNote,
  } = investigate.useInvestigation({
    user,
    from: range.start.toISOString(),
    to: range.end.toISOString(),
  });

  const gridItems = useMemo(() => {
    const widgetDefinitionsByType = keyBy(widgetDefinitions, 'type');

    return renderableInvestigation?.items.map((item) => {
      const definitionForType = widgetDefinitionsByType[item.type];

      return {
        title: item.title,
        description: item.description ?? '',
        id: item.id,
        element: item.element,
        columns: item.columns,
        rows: item.rows,
        chrome: definitionForType.chrome,
        loading: item.loading,
      };
    });
  }, [renderableInvestigation, widgetDefinitions]);

  if (!investigation || !renderableInvestigation || !gridItems || !investigationData) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem grow={8}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <InvestigateSearchBar
                rangeFrom={range.from}
                rangeTo={range.to}
                onQuerySubmit={async ({ dateRange }) => {
                  const nextDateRange = {
                    from: datemath.parse(dateRange.from)!.toISOString(),
                    to: datemath.parse(dateRange.to)!.toISOString(),
                  };
                  await setGlobalParameters({
                    ...renderableInvestigation.parameters,
                    timeRange: nextDateRange,
                  });

                  setRange(nextDateRange);
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <InvestigateWidgetGrid
                items={gridItems}
                onItemsChange={async (nextGridItems) => {
                  noop();
                }}
                onItemCopy={async (copiedItem) => {
                  return copyItem(copiedItem.id);
                }}
                onItemDelete={async (deletedItem) => {
                  return deleteItem(deletedItem.id);
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <AddObservationUI
            timeRange={renderableInvestigation.parameters.timeRange}
            onWidgetAdd={(widget) => {
              return addItem(widget);
            }}
          />
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={2}>
        <InvestigationNotes
          notes={investigationData.notes}
          addNote={handleAddInvestigationNote}
          deleteNote={deleteNote}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function InvestigationDetails({ investigationId }: { investigationId: string }) {
  const {
    core: { security },
  } = useKibana();

  const user = useAsync(() => {
    return security.authc.getCurrentUser();
  }, [security]);

  if (investigationId == null) {
    // TODO: return 404 page
    return null;
  }

  return user.value ? (
    <InvestigationDetailsWithUser user={user.value} investigationId={investigationId} />
  ) : null;
}
