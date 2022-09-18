/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiTitle, EuiLoadingChart } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaPublicApi, LensPublicStart } from '@kbn/lens-plugin/public';
import { ControlType, TimeRange, Workspace } from '../../types/workspace_state';
import { TIME_STEPS, getCustomActions } from './actions';
import { buildQueryFilters, getLensAttributes, MAIN_COLOR, SELECTION_COLOR } from './helpers';

export interface TimebarProps {
  workspace: Workspace;
  lens: LensPublicStart;
  indexPattern?: DataView;
  onSetControl: (control: ControlType) => void;
}

export function Timebar({ workspace, indexPattern, lens, onSetControl }: TimebarProps) {
  const [_, setIsLoading] = useState(false);
  const [formulaApi, saveFormulaAPI] = useState<FormulaPublicApi | undefined>(undefined);
  const [timeRange, setTimeRange] = useState<undefined | TimeRange>();
  const [timeFilter, setTimeFilter] = useState<undefined | TimeRange>();
  const [playIndex, setPlayIndex] = useState<undefined | number>();
  const [playTimeFilter, setPlayTimeFilter] = useState<undefined | TimeRange>();

  useEffect(() => {
    const timeField = indexPattern?.getTimeField();
    if (!timeField) {
      return;
    }
    Promise.all([
      lens.stateHelperApi(),
      workspace.getTimeExtents(timeField.name, buildQueryFilters(workspace.edges)),
    ]).then(([{ formula }, newTimeRange]) => {
      saveFormulaAPI(formula);
      setTimeRange(newTimeRange);
    });
  }, [indexPattern, lens, workspace]);

  const filterGraphByTimeRange = useCallback(
    (range: number[], updateTimeFilter: (range: TimeRange) => void) => {
      if (!indexPattern) {
        return;
      }

      const newTimeFilter = {
        from: moment(range[0]).toISOString(),
        to: moment(range[1]).toISOString(),
      };

      // add an annotation layer to the attributes?
      workspace
        .selectGraphInTime(indexPattern.getTimeField()!.name, newTimeFilter)
        .then(() => onSetControl('timeFilter'));
      updateTimeFilter(newTimeFilter);
    },
    [indexPattern, onSetControl, workspace]
  );
  useEffect(() => {
    if (!timeRange) {
      return;
    }
    if (playIndex == null) {
      return onSetControl('none');
    }
    // workout the time slices
    const timeRangeMs = moment(timeRange.to).diff(moment(timeRange.from));
    // workout the step size
    const stepLength = timeRangeMs / TIME_STEPS;
    const endTime = moment(timeRange.from).add(stepLength * (playIndex + 1));
    const range = [
      moment(timeRange.from).valueOf(),
      endTime.isAfter(timeRange.to) ? moment(timeRange.to).valueOf() : endTime.valueOf(),
    ];
    filterGraphByTimeRange(range, setPlayTimeFilter);
  }, [filterGraphByTimeRange, playIndex, timeRange, onSetControl]);

  if (!indexPattern || !indexPattern.getTimeField()) {
    return null;
  }
  if (!formulaApi || !timeRange) {
    return (
      <EuiPanel className="gphTimebar">
        <EuiTitle size="m">
          <EuiLoadingChart size="xl" />
        </EuiTitle>
      </EuiPanel>
    );
  }

  const LensComponent = lens.EmbeddableComponent;
  const actions = getCustomActions({
    lens,
    // Omit the timeFilter for now to not break the Lens Editor
    attributes: getLensAttributes(workspace, indexPattern, formulaApi, {
      timeFilter,
      playTimeFilter: undefined,
    }),
    timeRange,
    setPlayIndex,
  });

  const selectionLabel = !workspace.getEdgeSelection().length ? (
    ''
  ) : (
    <>
      <FormattedMessage id="xpack.graph.timebar.selectionVs" defaultMessage=" vs " />
      <strong>
        <span style={{ color: SELECTION_COLOR }} className="gphTitleSelection">
          <FormattedMessage
            id="xpack.graph.timebar.selection"
            defaultMessage="{selectionLength, plural, one { Selection } other { Selection ({selectionLength}) }}"
            values={{
              selectionLength: workspace.getEdgeSelection().length,
            }}
          />
        </span>
      </strong>
    </>
  );

  const playLabel = playIndex == null ? '' : <EuiLoadingChart size="m" />;

  return (
    <EuiPanel className="gphTimebar">
      <EuiTitle size="m">
        <FormattedMessage
          id="xpack.graph.timebar.title"
          defaultMessage="Graph timebar: {mainContent}{selectionLabel} {playLabel}"
          values={{
            mainContent: (
              <strong>
                <span style={{ color: MAIN_COLOR }} className="gphTitleContent">
                  <FormattedMessage
                    id="xpack.graph.timebar.mainContent"
                    defaultMessage="Connections traffic"
                  />
                </span>
              </strong>
            ),
            selectionLabel,
            playLabel,
          }}
        />
      </EuiTitle>
      <LensComponent
        id="timebar"
        className="gphTimebar__component"
        timeRange={timeRange}
        attributes={getLensAttributes(workspace, indexPattern, formulaApi, {
          timeFilter,
          playTimeFilter: playIndex == null ? undefined : playTimeFilter,
        })}
        onLoad={(val) => {
          setIsLoading(val);
        }}
        onBrushEnd={({ range }) => {
          filterGraphByTimeRange(range, setTimeFilter);
        }}
        onFilter={(_data) => {
          // call back event for on filter event
          workspace.clearTimeFilter();
          setTimeFilter(undefined);
          onSetControl('none');
        }}
        viewMode={ViewMode.VIEW}
        extraActions={actions}
        withDefaultActions
      />
    </EuiPanel>
  );
}
