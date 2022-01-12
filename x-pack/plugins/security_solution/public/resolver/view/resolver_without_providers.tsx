/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useContext, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useResolverQueryParamCleaner } from './use_resolver_query_params_cleaner';
import * as selectors from '../store/selectors';
import { EdgeLine } from './edge_line';
import { GraphControls } from './graph_controls';
import { ProcessEventDot } from './process_event_dot';
import { useCamera } from './use_camera';
import { SymbolDefinitions } from './symbol_definitions';
import { useStateSyncingActions } from './use_state_syncing_actions';
import { StyledMapContainer, GraphContainer } from './styles';
import * as nodeModel from '../../../common/endpoint/models/node';
import { SideEffectContext } from './side_effect_context';
import { ResolverProps, ResolverState } from '../types';
import { PanelRouter } from './panels';
import { useColors } from './use_colors';
import { useSyncSelectedNode } from './use_sync_selected_node';
import { ResolverNoProcessEvents } from './resolver_no_process_events';

/**
 * The highest level connected Resolver component. Needs a `Provider` in its ancestry to work.
 */
export const ResolverWithoutProviders = React.memo(
  /**
   * Use `forwardRef` so that the `Simulator` used in testing can access the top level DOM element.
   */
  React.forwardRef(function (
    {
      className,
      databaseDocumentID,
      resolverComponentInstanceID,
      indices,
      shouldUpdate,
      filters,
    }: ResolverProps,
    refToForward
  ) {
    useResolverQueryParamCleaner();
    /**
     * This is responsible for dispatching actions that include any external data.
     * `databaseDocumentID`
     */
    useStateSyncingActions({
      databaseDocumentID,
      resolverComponentInstanceID,
      indices,
      shouldUpdate,
      filters,
    });

    /**
     * This will keep the selectedNode in the view in sync with the nodeID specified in the url
     */
    useSyncSelectedNode();

    const { timestamp } = useContext(SideEffectContext);

    // use this for the entire render in order to keep things in sync
    const timeAtRender = timestamp();

    const { processNodePositions, connectingEdgeLineSegments } = useSelector(
      (state: ResolverState) => selectors.visibleNodesAndEdgeLines(state)(timeAtRender)
    );

    const { projectionMatrix, ref: cameraRef, onMouseDown } = useCamera();

    const ref = useCallback(
      (element: HTMLDivElement | null) => {
        // Supply `useCamera` with the ref
        cameraRef(element);

        // If a ref is being forwarded, populate that as well.
        if (typeof refToForward === 'function') {
          refToForward(element);
        } else if (refToForward !== null) {
          refToForward.current = element;
        }
      },
      [cameraRef, refToForward]
    );
    const isLoading = useSelector(selectors.isTreeLoading);
    const hasError = useSelector(selectors.hadErrorLoadingTree);
    const activeDescendantId = useSelector(selectors.ariaActiveDescendant);
    const resolverTreeHasNodes = useSelector(selectors.resolverTreeHasNodes);
    const colorMap = useColors();

    return (
      <StyledMapContainer className={className} backgroundColor={colorMap.resolverBackground}>
        {isLoading ? (
          <div data-test-subj="resolver:graph:loading" className="loading-container">
            <EuiLoadingSpinner size="xl" />
          </div>
        ) : hasError ? (
          <div data-test-subj="resolver:graph:error" className="loading-container">
            <div>
              {' '}
              <FormattedMessage
                id="xpack.securitySolution.endpoint.resolver.loadingError"
                defaultMessage="Error loading data."
              />
            </div>
          </div>
        ) : resolverTreeHasNodes ? (
          <>
            <GraphContainer
              data-test-subj="resolver:graph"
              className="resolver-graph kbn-resetFocusState"
              onMouseDown={onMouseDown}
              ref={ref}
              role="tree"
              tabIndex={0}
              aria-activedescendant={activeDescendantId || undefined}
            >
              {connectingEdgeLineSegments.map(
                ({ points: [startPosition, endPosition], metadata }) => (
                  <EdgeLine
                    edgeLineMetadata={metadata}
                    key={metadata.reactKey}
                    startPosition={startPosition}
                    endPosition={endPosition}
                    projectionMatrix={projectionMatrix}
                  />
                )
              )}
              {[...processNodePositions].map(([treeNode, position]) => {
                const nodeID = nodeModel.nodeID(treeNode);
                if (nodeID === undefined) {
                  throw new Error('Tried to render a node without an ID');
                }
                return (
                  <ProcessEventDot
                    key={nodeID}
                    nodeID={nodeID}
                    position={position}
                    projectionMatrix={projectionMatrix}
                    node={treeNode}
                    timeAtRender={timeAtRender}
                  />
                );
              })}
            </GraphContainer>
            <PanelRouter />
          </>
        ) : (
          <ResolverNoProcessEvents />
        )}
        <GraphControls />
        <SymbolDefinitions />
      </StyledMapContainer>
    );
  })
);
