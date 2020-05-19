/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/ui-shared-deps/monaco';
import {
  EuiPanel,
  EuiFormRow,
  EuiFieldText,
  EuiProgress,
  EuiSelect,
  EuiPopover,
  EuiButton,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { CodeEditor } from '../../../../../src/plugins/kibana_react/public';
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';

interface SearchNodeState {
  method: 'POST';
  path: string;
  body: string;
}

function SearchNode({ node, dispatch }: RenderNode<SearchNodeState>) {
  const loader = useLoader();
  const [isOpen, setState] = useState(false);
  return (
    <div>
      {loader.lastData[node.id]?.loading ? <EuiProgress /> : null}

      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.searchNode.requestMethodLabel', {
          defaultMessage: 'Request',
        })}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}> POST</EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFieldText
              value={node.state.path}
              placeholder={i18n.translate('xpack.pipeline_builder.searchNode.requestPathLabel', {
                defaultMessage: 'Request path, like /kibana_sample_data_logs/_search',
              })}
              onChange={e => {
                dispatch({
                  type: 'SET_NODE',
                  nodeId: node.id,
                  newState: { ...node.state, path: e.target.value },
                });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>

      <CodeEditor
        languageId="json"
        // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
        width="99%"
        height="200px"
        value={node.state.body}
        onChange={code => {
          dispatch({
            type: 'SET_NODE',
            nodeId: node.id,
            newState: { ...node.state, body: code },
          });
        }}
        options={{
          fontSize: 12,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
        editorDidMount={(editor: monaco.editor.IStandaloneCodeEditor) => {
          // Updating tab size for the editor
          const model = editor.getModel();
          if (model) {
            model.updateOptions({ tabSize: 2 });
          }
        }}
      />

      <EuiPopover
        isOpen={isOpen}
        closePopover={() => {
          setState(false);
        }}
        button={
          <EuiLink
            onClick={() => {
              setState(true);
            }}
          >
            Switch to example requests
          </EuiLink>
        }
      >
        <div>
          <EuiButton
            onClick={() => {
              dispatch({
                type: 'SET_NODE',
                nodeId: node.id,
                newState: getStateForLogs(),
              });
              setState(false);
            }}
          >
            Logs example
          </EuiButton>
        </div>
        <div>
          <EuiButton
            onClick={() => {
              dispatch({
                type: 'SET_NODE',
                nodeId: node.id,
                newState: getStateForHistogram(),
              });
              setState(false);
            }}
          >
            Histogram example
          </EuiButton>
        </div>
        <div>
          <EuiButton
            onClick={() => {
              dispatch({
                type: 'SET_NODE',
                nodeId: node.id,
                newState: getStateForSql(),
              });
              setState(false);
            }}
          >
            SQL example
          </EuiButton>
        </div>
        <div>
          <EuiButton
            onClick={() => {
              dispatch({
                type: 'SET_NODE',
                nodeId: node.id,
                newState: getStateForSource(),
              });
              setState(false);
            }}
          >
            Raw documents example
          </EuiButton>
        </div>
      </EuiPopover>
    </div>
  );
}

export const definition: NodeDefinition<SearchNodeState> = {
  title: i18n.translate('xpack.pipeline_builder.searchNodeTitle', {
    defaultMessage: 'ES Search Query',
  }),
  inputNodeTypes: [],
  outputType: 'json',

  icon: 'search',

  initialize(): SearchNodeState {
    return getStateForLogs();
  },

  renderReact: SearchNode,

  async run(node, inputs, inputNodeIds, deps) {
    const { state } = node;
    const fn = deps.http.post;
    try {
      const result = await fn('/api/console/proxy', {
        query: { path: state.path, method: state.method },
        body: state.body,
      });

      return result;
    } catch (e) {
      throw new Error(`${e.body.error.reason}

      On line ${e.body.error.line}:
${state.body.split('\n')[e.body.error.line - 1]}`);
    }
  },
};

function getStateForLogs(): SearchNodeState {
  return {
    method: 'POST',
    path: 'kibana_sample_data_logs/_search',
    body: JSON.stringify(
      {
        query: { match_all: {} },
        aggs: {
          date: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: '1d',
            },
            aggs: {
              a: {
                avg: { field: 'bytes' },
              },
            },
          },
        },
        size: 0,
      },
      null,
      2
    ),
  };
}

function getStateForHistogram(): SearchNodeState {
  return {
    method: 'POST',
    path: 'kibana_sample_data_logs/_search',
    body: JSON.stringify(
      {
        query: { match_all: {} },
        aggs: {
          histo: {
            histogram: {
              field: 'bytes',
              interval: '1000',
            },
          },
        },
        size: 0,
      },
      null,
      2
    ),
  };
}

function getStateForSql(): SearchNodeState {
  return {
    method: 'POST',
    path: '/_sql?format=json',
    body: JSON.stringify(
      {
        query: 'SELECT "@timestamp", geo.src, bytes FROM kibana_sample_data_logs',
        fetch_size: 10,
      },
      null,
      2
    ),
  };
}

function getStateForSource(): SearchNodeState {
  return {
    method: 'POST',
    path: 'metricbeat-*/_search',
    body: JSON.stringify(
      {
        size: 100,
        query: { match_all: {} },
      },
      null,
      2
    ),
  };
}
