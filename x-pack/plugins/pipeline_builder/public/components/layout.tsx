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

export function Layout({ state, dispatch }: { state: State; dispatch: DispatchFn }) {
  const { services } = useKibana<PipelineAppDeps>();
  const { data, http } = services;
  const loader = useLoader();

  const analyzed = analyzeDag(state);
  // const entries = Object.entries(state.nodes);
  // const noInputs = entries.filter(([, node]) => node.inputNodeIds.length === 0);
  // const withInput = entries.filter(([, node]) => node.inputNodeIds.length > 0);
  const terminalNode = analyzed.find(a => a.isTerminalNode);

  return (
    <div className="pipelineFrameLayout">
      {/* {state.loading === true ? <EuiProgress /> : null} */}

      <div className="pipelineFrameLayout__pageContent">
        <CreateNodeButton
          state={state}
          dispatch={dispatch}
          inputNodeIds={[]}
          title={i18n.translate('xpack.pipeline_builder.createNodeButtonLabel', {
            defaultMessage: 'Create data fetching node',
          })}
        />

        <EuiFlexGroup direction="row" wrap={true}>
          {analyzed
            .filter(a => a.isStartNode)
            .map(({ id, node }) => (
              <EuiFlexItem key={id} className="pipeline__startNode">
                <RenderNode id={id} node={node} dispatch={dispatch} />
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>

        <div className="euiCommentList">
          {analyzed
            .filter(a => !a.isStartNode)
            .map(({ id, node }) => (
              <RenderNode key={id} id={id} node={node} dispatch={dispatch} />
            ))}

          <div className="euiComment">
            <div className="euiCommentTimeline">
              <div className="euiCommentTimeline__content">
                <EuiIcon type="plusInCircle" />
              </div>
            </div>

            {terminalNode ? (
              <CreateNodeButton
                state={state}
                dispatch={dispatch}
                inputNodeIds={[terminalNode.id]}
                title={i18n.translate('xpack.pipeline_builder.transformationNodeButtonLabel', {
                  defaultMessage: 'Add transformation node',
                })}
              />
            ) : null}
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
  return (
    <div>
      {/* <div className="euiCommentTimeline">
        <div className="euiCommentTimeline__content">
          <EuiIcon type={nodeRegistry[node.type].icon} />
        </div>
      </div> */}
      <EuiPanel className="pipelineBuilder__node euiCommentEvent">
        <EuiTabbedContent
          tabs={[
            {
              id: 'main',
              name: 'Edit',
              content: (
                <EuiAccordion
                  id={id}
                  buttonContent={nodeRegistry[node.type].title}
                  initialIsOpen={true}
                >
                  {nodeRegistry[node.type].renderReact({
                    node,
                    dispatch,
                  })}
                </EuiAccordion>
              ),
            },

            {
              id: 'output',
              name: 'Output',
              content: (
                <EuiCodeBlock language="json">
                  {JSON.stringify(loader.lastData[id]?.value, null, 2)}
                </EuiCodeBlock>
              ),
            },
          ]}
        />

        {/* <CreateNodeButton
                  state={state}
                  dispatch={dispatch}
                  inputNodeIds={[id]}
                  title={i18n.translate('xpack.pipeline_builder.transformationNodeButtonLabel', {
                    defaultMessage: 'Add transformation node',
                  })}
                />

                <EuiButton size="s">
                  {i18n.translate('xpack.pipeline_builder.inspectNodeLabel', {
                    defaultMessage: 'Inspect result',
                  })}
                </EuiButton> */}

        {/* <EuiButton size="s">
          <EuiIcon type="trash" />
          {i18n.translate('xpack.pipeline_builder.deleteNodeLabel', {
            defaultMessage: 'Delete node',
          })}
        </EuiButton> */}
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

  // const inputNodeTypes = inputNodeIds.map(id => nodeRegistry[state.nodes[id].type].outputType);
  const filteredNodes = Object.entries(nodeRegistry).filter(([id, node]) => {
    if (inputNodeIds.length === 0) {
      return node.inputNodeTypes.length === 0;
    }
    return node.inputNodeTypes.length > 0;
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
        >
          {title}
        </EuiButton>
      }
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
