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
  EuiCommentList,
  EuiTabs,
  EuiTab,
  EuiTabbedContent,
  EuiCodeBlock,
} from '@elastic/eui';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { State, DispatchFn, PipelineAppDeps, NodeDefinition, Node } from '../types';
import { nodeRegistry } from '../nodes';
import { renderersRegistry } from '../renderers';
import { useLoader, analyzeDag } from '../state';

function getChain(a: Record<string, Node>, startAt: string): Node[] {
  const nodes: Node[] = [];

  nodes.push(a[startAt]);

  const compareAgainst = Object.values(a);
  let previousId = startAt;
  compareAgainst.forEach(n => {
    if (n.inputNodeIds.includes(previousId)) {
      if (n.inputNodeIds.length === 1) {
        nodes.push(n);
        previousId = n.id;
      }
    }
  });

  return nodes;
}

function getChainInformation(a: Record<string, Node>) {
  const copy = { ...a };

  const entries = Object.entries(copy);

  const startEntries = entries.filter(([id, node]) => node.inputNodeIds.length === 0);

  const startChains = startEntries.map(([i]) => {
    const chain = getChain(copy, i);
    chain.forEach(({ id }) => {
      delete copy[id];
    });
    return chain;
  });
  const lastChainIds = startChains.map(c => c[c.length - 1].id);
  const otherChains = Object.entries(copy)
    .filter(([id, n]) => lastChainIds.some(i => n.inputNodeIds.includes(i)))
    .map(([id, n]) => getChain(copy, id));
  return {
    startChains,
    otherChains,
  };
}

export function Layout({ state, dispatch }: { state: State; dispatch: DispatchFn }) {
  const { services } = useKibana<PipelineAppDeps>();
  const { data, http } = services;
  const loader = useLoader();

  const { startChains, otherChains } = getChainInformation(state.nodes);
  console.log(state.nodes, startChains, otherChains);

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
              <CreateNodeButton
                state={state}
                dispatch={dispatch}
                inputNodeIds={startChains.map(c => c[c.length - 1].id)}
                title={i18n.translate('xpack.pipeline_builder.joinNodesButtonLabel', {
                  defaultMessage: 'Join all queries',
                })}
              />
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

        {/* <EuiFlexGroup direction="column" wrap={true}>
          {startNodes.map(({ id, node }) => (
              <EuiFlexItem key={id} className="pipeline__startNode">
                <RenderNode id={id} node={node} dispatch={dispatch} />
              </EuiFlexItem>
            ))}
        </EuiFlexGroup> */}

        <div className="euiCommentList">
          {/* {analyzed
            .filter(a => !a.isStartNode)
            .map(({ id, node }) => (
              <RenderNode key={id} id={id} node={node} dispatch={dispatch} />
            ))} */}

          <div className="euiComment">
            <div className="euiCommentTimeline">
              <div className="euiCommentTimeline__content">
                <EuiIcon type="plusInCircle" />
              </div>
            </div>

            {/* {terminalNode ? (
              <CreateNodeButton
                state={state}
                dispatch={dispatch}
                inputNodeIds={[terminalNode.id]}
                title={i18n.translate('xpack.pipeline_builder.transformationNodeButtonLabel', {
                  defaultMessage: 'Add transformation node',
                })}
              />
            ) : null} */}
          </div>

          <div className="euiComment">
            <div className="euiCommentTimeline">
              <div className="euiCommentTimeline__content">
                <EuiIcon type="dot" />
              </div>
            </div>
            {i18n.translate('xpack.pipeline_builder.renderVisualizationLabel', {
              defaultMessage: 'Render visualization',
            })}
          </div>
        </div>
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

          {/* <EuiFlexItem>
            <EuiAccordion id={'json'} buttonContent={'JSON inspector'} initialIsOpen={true}>
              {renderersRegistry.json({ state })}
            </EuiAccordion>
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </div>
    </div>
  );
}

function RenderNode({ node, id, dispatch }: { id: string; node: Node; dispatch: DispatchFn }) {
  const loader = useLoader();

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

  const data = loader.lastData[id]?.value;
  if (data) {
    tabs.push({
      id: 'output',
      name: 'JSON Output',
      content: (
        <div className="pipelineBuilder__nodeOutput">
          <EuiCodeBlock language="json">
            {JSON.stringify(loader.lastData[id]?.value, null, 2)}
          </EuiCodeBlock>
        </div>
      ),
    });
  }

  return (
    <div>
      <EuiPanel className="pipelineBuilder__node euiCommentEvent">
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
