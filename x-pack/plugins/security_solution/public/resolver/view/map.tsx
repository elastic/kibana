/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-duplicate-imports */

/* eslint-disable react/display-name */

import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as selectors from '../store/selectors';
import { EdgeLine } from './edge_line';
import { GraphControls } from './graph_controls';
import { ProcessEventDot } from './process_event_dot';
import { useCamera } from './use_camera';
import { SymbolDefinitions, useResolverTheme } from './assets';
import { useStateSyncingActions } from './use_state_syncing_actions';
import { StyledMapContainer, StyledPanel, GraphContainer } from './styles';
import { entityId } from '../../../common/endpoint/models/event';
import { SideEffectContext } from './side_effect_context';

/**
 * The highest level connected Resolver component. Needs a `Provider` in its ancestry to work.
 */
export const ResolverMap = React.memo(function ({
  className,
  databaseDocumentID,
}: {
  /**
   * Used by `styled-components`.
   */
  className?: string;
  /**
   * The `_id` value of an event in ES.
   * Used as the origin of the Resolver graph.
   */
  databaseDocumentID?: string;
}) {
  /**
   * This is responsible for dispatching actions that include any external data.
   * `databaseDocumentID`
   */
  useStateSyncingActions({ databaseDocumentID });

  const { timestamp } = useContext(SideEffectContext);
  const { processNodePositions, connectingEdgeLineSegments } = useSelector(
    selectors.visibleProcessNodePositionsAndEdgeLineSegments
  )(timestamp());
  const { processToAdjacencyMap } = useSelector(selectors.processAdjacencies);
  const relatedEventsStats = useSelector(selectors.relatedEventsStats);
  const terminatedProcesses = useSelector(selectors.terminatedProcesses);
  const { projectionMatrix, ref, onMouseDown } = useCamera();
  const isLoading = useSelector(selectors.isLoading);
  const hasError = useSelector(selectors.hasError);
  const activeDescendantId = useSelector(selectors.uiActiveDescendantId);
  const { colorMap } = useResolverTheme();

  return (
    <StyledMapContainer className={className} backgroundColor={colorMap.resolverBackground}>
      {isLoading ? (
        <div className="loading-container">
          <EuiLoadingSpinner size="xl" />
        </div>
      ) : hasError ? (
        <div className="loading-container">
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
          className="resolver-graph kbn-resetFocusState"
          onMouseDown={onMouseDown}
          ref={ref}
          role="tree"
          tabIndex={0}
          aria-activedescendant={activeDescendantId || undefined}
        >
          {connectingEdgeLineSegments.map(({ points: [startPosition, endPosition], metadata }) => (
            <EdgeLine
              edgeLineMetadata={metadata}
              key={metadata.uniqueId}
              startPosition={startPosition}
              endPosition={endPosition}
              projectionMatrix={projectionMatrix}
            />
          ))}
          {[...processNodePositions].map(([processEvent, position]) => {
            const adjacentNodeMap = processToAdjacencyMap.get(processEvent);
            const processEntityId = entityId(processEvent);
            if (!adjacentNodeMap) {
              // This should never happen
              throw new Error('Issue calculating adjacency node map.');
            }
            return (
              <ProcessEventDot
                key={processEntityId}
                position={position}
                projectionMatrix={projectionMatrix}
                event={processEvent}
                adjacentNodeMap={adjacentNodeMap}
                relatedEventsStatsForProcess={
                  relatedEventsStats ? relatedEventsStats.get(entityId(processEvent)) : undefined
                }
                isProcessTerminated={terminatedProcesses.has(processEntityId)}
                isProcessOrigin={false}
              />
            );
          })}
        </GraphContainer>
      )}
      <StyledPanel />
      <GraphControls />
      <SymbolDefinitions />
    </StyledMapContainer>
  );
});
