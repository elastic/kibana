/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiProgress,
  EuiPopover,
  EuiAccordion,
  EuiListGroup,
  EuiListGroupItem,
  EuiIcon,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiTabbedContent,
  EuiCodeBlock,
} from '@elastic/eui';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { State, DispatchFn, PipelineAppDeps, NodeDefinition, Node } from '../types';
import { nodeRegistry } from '../nodes';
import { renderersRegistry } from '../renderers';
import { useLoader, getChainInformation } from '../state';

export function Layout({ state, dispatch }: { state: State; dispatch: DispatchFn }) {
  const { services } = useKibana<PipelineAppDeps>();
  const { data, http } = services;
  const loader = useLoader();

  const { startChains, otherChains } = getChainInformation(state.nodes);

  return (
    <div className="pipelineFrameLayout">
      {/* {state.loading === true ? <EuiProgress /> : null} */}

      <div className="pipelineFrameLayout__pageContent">
        <EuiFlexGroup direction="row">
          {startChains.map(chain => (
            <EuiFlexItem>
              <EuiPanel className="pipelineBuilder__chain">
                <EuiButton
                  type="danger"
                  size="s"
                  onClick={() => {
                    dispatch({
                      type: 'DELETE_NODES',
                      nodeIds: chain.map(({ id }) => id),
                    });
                  }}
                >
                  <EuiIcon type="trash" size="s" />
                </EuiButton>

                <EuiFlexGroup direction="column">
                  {chain.map(n => (
                    <EuiFlexItem key={n.id}>
                      <RenderNode id={n.id} node={n} dispatch={dispatch} />
                    </EuiFlexItem>
                  ))}

                  {chain.length ? (
                    <EuiFlexItem>
                      <CreateNodeButton
                        state={state}
                        dispatch={dispatch}
                        inputNodeIds={[chain[chain.length - 1].id]}
                        title={i18n.translate(
                          'xpack.pipeline_builder.transformationNodeButtonLabel',
                          { defaultMessage: 'Add transformation node' }
                        )}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}

          {startChains.length < 2 ? (
            <EuiFlexItem grow={false}>
              <CreateNodeButton
                state={state}
                dispatch={dispatch}
                inputNodeIds={[]}
                title={i18n.translate('xpack.pipeline_builder.createNodeButtonLabel', {
                  defaultMessage: 'Create data fetching node',
                })}
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>

        <EuiFlexGroup direction="row">
          {startChains.length > 1 && !otherChains.length ? (
            <EuiFlexItem grow={true} className="pipelineBuilder__createJoinButton">
              <EuiButton
                onClick={() => {
                  dispatch({
                    type: 'CREATE_NODE',
                    nodeType: 'join',
                    inputNodeIds: startChains.map(c => c[c.length - 1].id),
                  });
                }}
                fullWidth
              >
                <EuiIcon type="plusInCircle" />
                {i18n.translate('xpack.pipeline_builder.joinNodesButtonLabel', {
                  defaultMessage: 'Join all queries',
                })}
              </EuiButton>
            </EuiFlexItem>
          ) : null}

          {otherChains.map(chain => (
            <EuiFlexItem>
              <EuiFlexGroup direction="column">
                {chain.map(n => (
                  <EuiFlexItem key={n.id}>
                    <RenderNode id={n.id} node={n} dispatch={dispatch} />
                  </EuiFlexItem>
                ))}

                <EuiFlexItem>
                  <CreateNodeButton
                    state={state}
                    dispatch={dispatch}
                    inputNodeIds={[chain[chain.length - 1].id]}
                    title={i18n.translate('xpack.pipeline_builder.transformationNodeButtonLabel', {
                      defaultMessage: 'Add transformation',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        <EuiFlexItem>
          <div>
            {i18n.translate('xpack.pipeline_builder.renderVisualizationLabel', {
              defaultMessage: 'Render visualization',
            })}
          </div>
        </EuiFlexItem>
      </div>
      <div className="pipelineFrameLayout__sidebar">
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => {
                loader.run(state, { data, http: http! });
              }}
              color="primary"
              size="s"
              fill
            >
              <EuiIcon type="play" />
              {i18n.translate('xpack.pipeline_builder.runButtonLabel', {
                defaultMessage: 'Run',
              })}
            </EuiButton>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiAccordion id={'chart'} buttonContent={'Chart'} initialIsOpen={true}>
              {renderersRegistry.chart({ state })}
            </EuiAccordion>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiAccordion id={'table'} buttonContent={'Table'} initialIsOpen={true}>
              {renderersRegistry.table({ state })}
            </EuiAccordion>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}

function RenderNode({ node, id, dispatch }: { id: string; node: Node; dispatch: DispatchFn }) {
  const loader = useLoader();

  const data = loader.lastData[id]?.value;
  const error = loader.lastData[id]?.error;

  const tabs = [
    {
      id: 'main',
      name: 'Edit',
      content: nodeRegistry[node.type].renderReact({
        node,
        dispatch,
      }),
    },
  ];

  if (error) {
    tabs.push({
      id: 'error',
      name: 'Error message',
      content: (
        <div className="pipelineBuilder__nodeOutput">
          <EuiCodeBlock language="json">{JSON.stringify(error, null, 2)}</EuiCodeBlock>
        </div>
      ),
    });
  }

  if (data) {
    tabs.push({
      id: 'output',
      name: 'JSON Output',
      content: (
        <div className="pipelineBuilder__nodeOutput">
          <EuiCodeBlock language="json">{JSON.stringify(data, null, 2)}</EuiCodeBlock>
        </div>
      ),
    });
  }

  return (
    <div>
      <EuiPanel className="pipelineBuilder__node">
        <span>
          <strong>{id}</strong>: {nodeRegistry[node.type].title}
        </span>
        <EuiTabbedContent display="condensed" tabs={tabs} />
      </EuiPanel>
    </div>
  );
}

function CreateNodeButton({
  state,
  dispatch,
  inputNodeIds,
  title,
}: {
  state: State;
  dispatch: DispatchFn;
  inputNodeIds: string[];
  title: string;
}) {
  const [isOpen, setState] = useState(false);

  const inputNodeTypes = inputNodeIds.map(id => nodeRegistry[state.nodes[id].type].outputType);
  const filteredNodes = Object.entries(nodeRegistry).filter(([id, node]) => {
    if (id === 'join') {
      return inputNodeIds.length >= 2;
    }
    if (inputNodeIds.length === 0) {
      return node.inputNodeTypes.length === 0;
    }
    return (
      node.inputNodeTypes.length > 0 && node.inputNodeTypes.every((t, i) => inputNodeTypes[i] === t)
    );
  });

  return (
    <EuiPopover
      isOpen={!!isOpen}
      closePopover={() => {
        setState(false);
      }}
      button={
        <EuiButton
          onClick={() => {
            setState(true);
          }}
          size="s"
          fullWidth
          fill
        >
          <EuiIcon type="plusInCircle" /> {title}
        </EuiButton>
      }
      display={'block'}
    >
      <EuiListGroup>
        {filteredNodes.map(([id, node]) => {
          return (
            <EuiListGroupItem
              key={id}
              label={node.title}
              onClick={() => {
                dispatch({
                  type: 'CREATE_NODE',
                  nodeType: id,
                  inputNodeIds,
                });
                setState(false);
              }}
            />
          );
        })}
      </EuiListGroup>
    </EuiPopover>
  );
}
