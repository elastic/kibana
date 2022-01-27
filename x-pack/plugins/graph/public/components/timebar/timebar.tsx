/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { DataView } from 'src/plugins/data_views/public';
import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { SavedObjectReference } from 'kibana/public';
import type { Action, ActionExecutionContext } from 'src/plugins/ui_actions/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import {
  ControlType,
  TermIntersect,
  TimeRange,
  Workspace,
  WorkspaceEdge,
} from '../../types/workspace_state';
import { ViewMode } from '../../../../../../src/plugins/embeddable/public';
import { IndexPattern } from '../../../../../../src/plugins/data/public';
import type {
  DateHistogramIndexPatternColumn,
  StaticValueIndexPatternColumn,
  FormulaPublicApi,
  LensPublicStart,
  PersistedIndexPatternLayer,
  TypedLensByValueInput,
  XYState,
} from '../../../../lens/public';

const HEIGHT = 250;
const TIME_STEPS = 5;
const DURATION = 15000;

interface ActionFactoryProps {
  id: string;
  label: string | ((context: ActionExecutionContext<object>) => string);
  icon: string | ((context: ActionExecutionContext<object>) => string);
  callback: () => void;
}

function createTimePlayer({
  duration,
  setIndex,
}: {
  duration: number;
  setIndex: (i: number | undefined) => void;
}) {
  let start: undefined | number;
  const stepLength = duration / TIME_STEPS;
  let cancelled = false;

  return {
    play: () => {
      function play(time: number) {
        if (start == null) {
          start = time;
        }
        const elapsed = time - start;

        const index = Math.round(elapsed / stepLength);
        setIndex(index);
        if (elapsed < duration && !cancelled) {
          requestAnimationFrame(play);
        } else {
          setIndex(undefined);
        }
      }
      requestAnimationFrame(play);
    },
    stop: () => {
      cancelled = true;
    },
  };
}

function getCallbackAction({ id, label, icon, callback }: ActionFactoryProps): Action {
  return {
    id,
    order: 48,
    getDisplayName: (context: ActionExecutionContext<object>): string => {
      return typeof label === 'function' ? label(context) : label;
    },
    getIconType: (context: ActionExecutionContext<object>): string => {
      return typeof icon === 'function' ? icon(context) : icon;
    },
    type: 'actionButton',
    isCompatible: async (context: ActionExecutionContext<object>): Promise<boolean> => true,
    execute: async (context: ActionExecutionContext<object>): Promise<void> => {
      callback();
      return;
    },
  };
}

function getCustomActions({
  lens,
  attributes,
  timeRange,
  setPlayIndex,
}: {
  lens: LensPublicStart;
  attributes: TypedLensByValueInput['attributes'];
  timeRange?: TimeRange;
  setPlayIndex: (i: number | undefined) => void;
}) {
  if (!lens.canUseEditor() || !timeRange) {
    return [];
  }

  const timeRangeMs = moment(timeRange.to).diff(moment(timeRange.from));
  const canPlay = timeRangeMs > DURATION;

  return [
    getCallbackAction({
      id: 'openInLensFromGraph',
      label: i18n.translate('xpack.graph.timebar.openInLens', {
        defaultMessage: 'Open in Lens',
      }),
      icon: 'lensApp',
      callback: () =>
        lens.navigateToPrefilledEditor(
          {
            id: '',
            timeRange,
            attributes,
          },
          {
            openInNewTab: true,
          }
        ),
    }),
    canPlay
      ? getCallbackAction({
          id: 'playTime',
          label: i18n.translate('xpack.graph.timebar.playTime', {
            defaultMessage: 'Play',
          }),
          icon: 'play',
          callback: () => {
            // start a controller that will update attributes periodically on the Lens embeddable
            const player = createTimePlayer({ duration: DURATION, setIndex: setPlayIndex });
            player.play();
          },
        })
      : null,
  ].filter(Boolean) as Action[];
}

function escapeString(string: string) {
  return string.replace(/'/g, `\\'`);
}

function buildQueryFilters(edges: WorkspaceEdge[]): Record<string, unknown> {
  return {
    bool: {
      should: edges.map(({ source, target }) => ({
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      [source.data.field]: source.data.term,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            {
              bool: {
                should: [
                  {
                    match_phrase: {
                      [target.data.field]: target.data.term,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      })),
    },
  };
}

function getKqlQuery(edges: WorkspaceEdge[]) {
  // workout the KQL query from the list of edges displayed
  const tuples = [];
  for (const edge of edges) {
    tuples.push([edge.source.data, edge.target.data]);
  }
  // remove duplicates
  const sets = new Set(
    tuples.map(([source, target]) => {
      return `(${escapeString(source.field)}: "${escapeString(source.term)}" AND ${escapeString(
        target.field
      )}: "${escapeString(target.term)}")`;
    })
  );
  return [...sets].join(' OR ');
}

function getBaseLayer(dataView: DataView): PersistedIndexPatternLayer {
  return {
    columnOrder: ['col1'],
    columns: {
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: dataView.timeFieldName!,
      } as DateHistogramIndexPatternColumn,
    },
  };
}

function getLensAttributes(
  workspace: Workspace,
  terms: TermIntersect[] | undefined,
  dataView: DataView,
  formula: FormulaPublicApi,
  {
    timeFilter,
    playTimeFilter,
  }: { timeFilter: TimeRange | undefined; playTimeFilter: TimeRange | undefined }
): TypedLensByValueInput['attributes'] {
  const dataLayers: Record<string, PersistedIndexPatternLayer> = {
    layer1: formula.insertOrReplaceFormulaColumn(
      'col2',
      {
        formula: `count(kql='${getKqlQuery(workspace.edges)}')`,
        label: i18n.translate('xpack.graph.leaveWorkspace.edges', {
          defaultMessage: 'Edges traffic',
        }),
      },
      getBaseLayer(dataView),
      dataView
    )!,
  };

  const layers: XYState['layers'] = [
    {
      accessors: ['col2'],
      layerId: 'layer1',
      layerType: 'data',
      seriesType: 'bar',
      xAccessor: 'col1',
    },
  ];

  if (terms?.length) {
    const edges = terms.map(
      (pair) =>
        ({
          source: workspace.nodesMap[pair.id1],
          target: workspace.nodesMap[pair.id2],
        } as unknown as WorkspaceEdge)
    );
    dataLayers.layer2 = formula.insertOrReplaceFormulaColumn(
      'col3',
      {
        formula: `count(kql='${getKqlQuery(edges)}')`,
        label: i18n.translate('xpack.graph.leaveWorkspace.edgesSelected', {
          defaultMessage:
            '{selection, plural, one {Edge} other {Edges}} selected {selection, plural, one {} other { ({selection}) }}',
          values: {
            selection: edges.length,
          },
        }),
      },
      getBaseLayer(dataView),
      dataView
    )!;

    layers.push({
      accessors: ['col3'],
      layerId: 'layer2',
      layerType: 'data',
      seriesType: 'line',
      xAccessor: 'col1',
      yConfig: [{ forAccessor: 'col3', axisMode: 'right' }],
    });
  }

  if (timeFilter) {
    const cols = ['col4', 'col5'];
    dataLayers.layer3 = {
      columnOrder: cols,
      columns: Object.fromEntries(
        [timeFilter.from, timeFilter.to].map((value, i) => [
          cols[i],
          {
            label: value,
            dataType: 'number',
            operationType: 'static_value',
            isStaticValue: true,
            isBucketed: false,
            scale: 'ratio',
            params: {
              value: String(moment(value).valueOf()),
            },
            references: [],
          } as StaticValueIndexPatternColumn,
        ])
      ),
    };
    layers.push({
      layerId: 'layer3',
      layerType: 'referenceLine',
      yConfig: cols.map((forAccessor, i) => ({
        forAccessor,
        axisMode: 'bottom',
        fill: i ? 'above' : 'below',
        lineWidth: 4,
        lineStyle: 'dashed',
        icon: i ? 'arrowLeft' : 'arrowRight',
      })),
      accessors: cols,
      seriesType: 'bar_stacked',
    });
  } else if (playTimeFilter) {
    const cols = ['col6'];
    dataLayers.layer4 = {
      columnOrder: cols,
      columns: Object.fromEntries(
        [playTimeFilter.to].map((value, i) => [
          cols[i],
          {
            label: value,
            dataType: 'number',
            operationType: 'static_value',
            isStaticValue: true,
            isBucketed: false,
            scale: 'ratio',
            params: {
              value: String(moment(value).valueOf()),
            },
            references: [],
          } as StaticValueIndexPatternColumn,
        ])
      ),
    };
    layers.push({
      layerId: 'layer4',
      layerType: 'referenceLine',
      yConfig: cols.map((forAccessor, i) => ({
        forAccessor,
        axisMode: 'bottom',
        fill: 'above',
        lineWidth: 2,
        lineStyle: 'solid',
        icon: 'arrowLeft',
        color: '#54B399',
        areaOpacity: 0.8,
      })),
      accessors: cols,
      seriesType: 'bar_stacked',
    });
  }

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers,
    legend: { isVisible: false, position: 'top' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: '', // TODO: replace with colored wrapped title
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      terms?.length
        ? {
            id: dataView.id!,
            name: 'indexpattern-datasource-layer-layer2',
            type: 'index-pattern',
          }
        : null,
      timeFilter
        ? {
            id: dataView.id!,
            name: 'indexpattern-datasource-layer-layer3',
            type: 'index-pattern',
          }
        : null,
      playTimeFilter
        ? {
            id: dataView.id!,
            name: 'indexpattern-datasource-layer-layer4',
            type: 'index-pattern',
          }
        : null,
    ].filter(Boolean) as SavedObjectReference[],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: dataLayers,
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

export interface TimebarProps {
  workspace: Workspace;
  lens: LensPublicStart;
  indexPattern?: IndexPattern;
  mergeCandidates?: TermIntersect[];
  onSetControl: (control: ControlType) => void;
}

export function Timebar({
  workspace,
  indexPattern,
  lens,
  mergeCandidates,
  onSetControl,
}: TimebarProps) {
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
      return;
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
  }, [filterGraphByTimeRange, playIndex, timeRange]);

  if (!indexPattern || !indexPattern.getTimeField()) {
    return null;
  }
  if (!formulaApi || !timeRange) {
    return (
      <EuiPanel style={{ maxHeight: HEIGHT }}>
        <EuiTitle size="m">
          <FormattedMessage id="xpack.graph.timebar.loading" defaultMessage="loading..." />
        </EuiTitle>
      </EuiPanel>
    );
  }

  const LensComponent = lens.EmbeddableComponent;
  const actions = getCustomActions({
    lens,
    // Omit the timeFilter for now to not break the Lens Editor
    attributes: getLensAttributes(workspace, mergeCandidates, indexPattern, formulaApi, {
      timeFilter: undefined,
      playTimeFilter: undefined,
    }),
    timeRange,
    setPlayIndex,
  });

  const selectionLabel = !mergeCandidates?.length ? (
    ''
  ) : (
    <>
      <FormattedMessage id="xpack.graph.timebar.selectionVs" defaultMessage=" vs " />
      <strong>
        <span style={{ color: '#6092C0' }}>
          <FormattedMessage
            id="xpack.graph.timebar.selection"
            defaultMessage="{selectionLength, plural, one { Selection } other { Selection ({selectionLength}) }}"
            values={{
              selectionLength: mergeCandidates.length,
            }}
          />
        </span>
      </strong>
    </>
  );

  const playLabel =
    playIndex == null ? (
      ''
    ) : (
      <FormattedMessage id="xpack.graph.timebar.playing" defaultMessage=" - playing..." />
    );

  return (
    <EuiPanel style={{ maxHeight: HEIGHT }}>
      <EuiTitle size="m">
        <FormattedMessage
          id="xpack.graph.timebar.title"
          defaultMessage="Graph timebar: {mainContent}{selectionLabel}{playLabel}"
          values={{
            mainContent: (
              <strong>
                <span style={{ color: '#54B399' }}>
                  <FormattedMessage
                    id="xpack.graph.timebar.mainContent"
                    defaultMessage="Edges traffic"
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
        style={{ height: (HEIGHT * 5) / 6 }}
        timeRange={timeRange}
        attributes={getLensAttributes(workspace, mergeCandidates, indexPattern, formulaApi, {
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
        withActions={actions}
      />
    </EuiPanel>
  );
}
