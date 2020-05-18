/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiAccordion,
  EuiBasicTable,
  EuiText,
  EuiButtonGroup,
  EuiButton,
  EuiIcon,
  EuiSelect,
  EuiFormRow,
  EuiSwitch,
} from '@elastic/eui';
import {
  Chart,
  Settings,
  Axis,
  BarSeries,
  BubbleSeries,
  Position,
  ScaleType,
} from '@elastic/charts';
import moment from 'moment';
import { State, DispatchFn } from '../types';
import { nodeRegistry } from '../nodes';
import { useLoader, getChainInformation } from '../state';

interface RendererState {
  outputType?: 'json' | 'table' | 'bar' | 'scatter';
  bars?: {
    x: string;
    y: string[];
    split?: string;
    stacked?: boolean;
  };
  scatter?: {
    x: string;
    y: string[];
    split?: string;
    markSize?: string;
  };
}

export function Renderer(props: { state: State; dispatch: DispatchFn }) {
  const loader = useLoader();
  const { state, dispatch } = props;
  const renderState: RendererState = state.rendererState;
  const { startChains, otherChains } = getChainInformation(state.nodes);

  const terminals = otherChains.length
    ? otherChains.map(c => c[c.length - 1])
    : startChains.map(c => c[c.length - 1]);
  const terminalData = terminals.map(a => loader.lastData[a.id]?.value);

  if (!terminalData.length) {
    return <EuiText>Missing data from nodes {terminals.map(t => t.id).join(', ')}</EuiText>;
  }

  if (terminalData.length > 1) {
    return (
      <EuiText>
        You are trying to render more than one node. Please define how the data is being joined.
      </EuiText>
    );
  }
  const data = terminalData[0];
  const expectedDataType = nodeRegistry[terminals[0].type].outputType;

  let selectedButtonGroup = renderState.outputType || 'table';
  if (expectedDataType === 'json') {
    selectedButtonGroup = 'json';
  }

  return (
    <>
      <EuiButtonGroup
        idSelected={selectedButtonGroup}
        options={[
          {
            id: 'json',
            label: 'JSON',
          },
          {
            id: 'table',
            label: 'Table',
            iconType: 'visTable',
          },
          {
            id: 'bar',
            label: 'Bar chart',
            iconType: 'visBarVertical',
          },
          {
            id: 'scatter',
            label: 'Scatter chart',
            iconType: 'apps',
          },
        ]}
        onChange={id => {
          dispatch({
            type: 'SET_RENDERER',
            newState: { ...renderState, outputType: id },
          });
        }}
        isFullWidth
      />

      {selectedButtonGroup === 'json' ? (
        <div className="pipelineBuilder__nodeOutput">
          <EuiText>Visualizing raw JSON: transform into table to see better visualizations</EuiText>
          <EuiCodeBlock language="json">{JSON.stringify(data, null, 2)}</EuiCodeBlock>
        </div>
      ) : null}

      {expectedDataType !== 'table' ? <EuiText>No renderer for non-tabular data</EuiText> : null}
      {!data ? (
        <EuiText>
          {' '}
          Missing data from nodes <strong>{terminals.map(t => t.id).join(', ')}</strong>{' '}
        </EuiText>
      ) : null}
      {selectedButtonGroup === 'table' && data ? (
        <EuiBasicTable
          columns={data.columns.map(col => ({
            field: col.id,
            name: col.label || col.id,
          }))}
          items={data.rows}
          tableLayout="auto"
        />
      ) : null}
      {selectedButtonGroup === 'bar' ? (
        <BarChartRender state={state} dispatch={dispatch} table={data} />
      ) : null}
      {selectedButtonGroup === 'scatter' ? (
        <ScatterChartRender state={state} dispatch={dispatch} table={data} />
      ) : null}
    </>
  );
}

function BarChartRender({
  state,
  dispatch,
  table,
}: {
  state: State;
  dispatch: DispatchFn;
  table: unknown;
}) {
  if (!table || !table.columns) {
    return null;
  }
  const rendererState: RendererState = state.rendererState;
  const barState = rendererState.bars || {
    x: table.columns[0]?.id,
    y: table.columns[1]?.id,
    split: undefined,
    stacked: false,
  };

  const xColumn = table.columns.find(c => c.id === barState.x);

  let xScaleType = ScaleType.Ordinal;
  if (xColumn?.dataType === 'date') {
    xScaleType = ScaleType.Time;
    table.rows = table.rows.map(r => ({ ...r, [xColumn.id]: r[xColumn.id].valueOf() }));
  } else if (xColumn?.dataType === 'number') {
    xScaleType = ScaleType.Linear;
  }

  return (
    <>
      <div style={{ height: '200px' }}>
        <Chart>
          <Settings />
          <Axis
            id={'x'}
            position={Position.Bottom}
            tickFormat={
              xScaleType === ScaleType.Time ? v => moment(v).format('YYYY-MM-DD') : undefined
            }
          />
          <Axis id={'y'} position={Position.Left} />
          <BarSeries
            id={'bar'}
            data={table.rows}
            xAccessor={barState.x}
            xScaleType={xScaleType}
            yAccessors={barState.y ? [barState.y] : []}
            splitSeriesAccessors={barState.split ? [barState.split] : []}
            stackAccessors={barState.stacked ? [barState.x] : []}
          />
        </Chart>
      </div>

      <div>
        <EuiFormRow label="X axis">
          <EuiSelect
            options={table.columns.map(c => ({ text: c.id }))}
            value={barState.x}
            onChange={e => {
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'bar',
                  bars: { ...barState, x: e.target.value },
                },
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Y axis">
          <EuiSelect
            options={table.columns.map(c => ({ text: c.id }))}
            value={barState.y}
            onChange={e => {
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'bar',
                  bars: { ...barState, y: e.target.value },
                },
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Split by">
          <EuiSelect
            options={[{ text: 'None', value: undefined }].concat(
              table.columns.map(c => ({ text: c.id }))
            )}
            value={barState.split ? barState.split : undefined}
            onChange={e => {
              const newValue = e.target.value ?? undefined;
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'bar',
                  bars: { ...barState, split: newValue },
                },
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Stacked">
          <EuiSwitch
            checked={barState.stacked}
            label="Stacked"
            onChange={() => {
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'bar',
                  bars: { ...barState, stacked: !barState.stacked },
                },
              });
            }}
          />
        </EuiFormRow>
      </div>
    </>
  );
}

function ScatterChartRender({
  state,
  dispatch,
  table,
}: {
  state: State;
  dispatch: DispatchFn;
  table: unknown;
}) {
  if (!table || !table.columns) {
    return null;
  }
  const rendererState: RendererState = state.rendererState;
  const scatterState = rendererState.scatter || {
    x: table.columns[0]?.id,
    y: table.columns[1]?.id,
    split: undefined,
    markSize: undefined,
  };

  const xColumn = table.columns.find(c => c.id === scatterState.x);

  let xScaleType = ScaleType.Ordinal;
  if (xColumn && xColumn.dataType === 'date') {
    xScaleType = ScaleType.Time;
    table.rows = table.rows.map(r => ({ ...r, [xColumn.id]: r[xColumn.id].valueOf() }));
  } else if (xColumn && xColumn.dataType === 'number') {
    xScaleType = ScaleType.Linear;
  }

  return (
    <>
      <div style={{ height: '200px' }}>
        <Chart>
          <Settings />
          <Axis
            id={'x'}
            position={Position.Bottom}
            tickFormat={
              xScaleType === ScaleType.Time ? v => moment(v).format('YYYY-MM-DD') : undefined
            }
          />
          <Axis id={'y'} position={Position.Left} />
          <BubbleSeries
            id={'bar'}
            data={table.rows}
            xAccessor={scatterState.x}
            xScaleType={xScaleType}
            yAccessors={scatterState.y ? [scatterState.y] : []}
            splitSeriesAccessors={scatterState.split ? [scatterState.split] : []}
            markSizeAccessor={scatterState.markSize ?? undefined}
          />
        </Chart>
      </div>

      <div>
        <EuiFormRow label="X axis">
          <EuiSelect
            options={table.columns.map(c => ({ text: c.id }))}
            value={scatterState.x}
            onChange={e => {
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'scatter',
                  scatter: { ...scatterState, x: e.target.value },
                },
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Y axis">
          <EuiSelect
            options={table.columns.map(c => ({ text: c.id }))}
            value={scatterState.y}
            onChange={e => {
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'scatter',
                  scatter: { ...scatterState, y: e.target.value },
                },
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Split by">
          <EuiSelect
            options={[{ text: 'None', value: undefined }].concat(
              table.columns.map(c => ({ text: c.id }))
            )}
            value={scatterState.split ? scatterState.split : undefined}
            onChange={e => {
              const newValue = e.target.value ?? undefined;
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'scatter',
                  scatter: { ...scatterState, split: newValue },
                },
              });
            }}
          />
        </EuiFormRow>

        <EuiFormRow label="Size of dot">
          <EuiSelect
            options={[{ text: 'None', value: undefined }].concat(
              table.columns.map(c => ({ text: c.id }))
            )}
            value={scatterState.markSize ? scatterState.markSize : undefined}
            onChange={e => {
              const newValue = e.target.value ?? undefined;
              dispatch({
                type: 'SET_RENDERER',
                newState: {
                  ...rendererState,
                  outputType: 'scatter',
                  scatter: { ...scatterState, markSize: newValue },
                },
              });
            }}
          />
        </EuiFormRow>
      </div>
    </>
  );
}
