/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React, { useContext, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useResolverQueryParamCleaner } from './use_resolver_query_params_cleaner';
import * as selectors from '../store/selectors';
import { EdgeLine } from './edge_line';
import { GraphControls } from './graph_controls';
import { ProcessEventDot } from './process_event_dot';
import { useCamera } from './use_camera';
import { SymbolDefinitions } from './symbol_definitions';
import { useStateSyncingActions } from './use_state_syncing_actions';
import { StyledMapContainer, GraphContainer } from './styles';
import { nodeID } from '../../../common/endpoint/models/node';
import { SideEffectContext } from './side_effect_context';
import { ResolverProps, ResolverState } from '../types';
import { PanelRouter } from './panels';
import { useColors } from './use_colors';

/**
 * The highest level connected Resolver component. Needs a `Provider` in its ancestry to work.
 */
export const ResolverWithoutProviders = React.memo(
  /**
   * Use `forwardRef` so that the `Simulator` used in testing can access the top level DOM element.
   */
  React.forwardRef(function (
    { className, databaseDocumentID, resolverComponentInstanceID, indices }: ResolverProps,
    refToForward
  ) {
    useResolverQueryParamCleaner();
    /**
     * This is responsible for dispatching actions that include any external data.
     * `databaseDocumentID`
     */
    useStateSyncingActions({ databaseDocumentID, resolverComponentInstanceID, indices });

    const { timestamp } = useContext(SideEffectContext);

    // use this for the entire render in order to keep things in sync
    const timeAtRender = timestamp();

    const {
      processNodePositions,
      connectingEdgeLineSegments,
    } = useSelector((state: ResolverState) =>
      selectors.visibleNodesAndEdgeLines(state)(timeAtRender)
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
    const isLoading = useSelector(selectors.isGraphLoading);
    const hasError = useSelector(selectors.hadErrorLoadingGraph);
    const activeDescendantId = useSelector(selectors.ariaActiveDescendant);
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
        ) : (
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
            {[...processNodePositions].map(([graphNode, position]) => {
              const nodeId = nodeID(graphNode);
              return (
                <ProcessEventDot
                  key={nodeId}
                  nodeID={nodeId}
                  position={position}
                  projectionMatrix={projectionMatrix}
                  node={graphNode}
                  timeAtRender={timeAtRender}
                />
              );
            })}
          </GraphContainer>
        )}
        <PanelRouter />
        <GraphControls />
        <SymbolDefinitions />
      </StyledMapContainer>
    );
  })
);
