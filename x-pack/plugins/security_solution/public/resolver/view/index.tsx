/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useLayoutEffect, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as selectors from '../store/selectors';
import { EdgeLine } from './edge_line';
import { Panel } from './panel';
import { GraphControls } from './graph_controls';
import { ProcessEventDot } from './process_event_dot';
import { useCamera } from './use_camera';
import { SymbolDefinitions, useResolverTheme } from './assets';
import { entityId } from '../../../common/endpoint/models/event';
import { ResolverAction } from '../types';
import { ResolverEvent } from '../../../common/endpoint/types';
import { SideEffectContext } from './side_effect_context';

interface StyledResolver {
  backgroundColor: string;
}

const StyledResolver = styled.div<StyledResolver>`
  /**
   * Take up all availble space
   */
  &,
  .resolver-graph {
    display: flex;
    flex-grow: 1;
  }
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
  }
  /**
   * The placeholder components use absolute positioning.
   */
  position: relative;
  /**
   * Prevent partially visible components from showing up outside the bounds of Resolver.
   */
  overflow: hidden;
  contain: strict;
  background-color: ${(props) => props.backgroundColor};
`;

const StyledPanel = styled(Panel)`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  overflow: auto;
  width: 25em;
  max-width: 50%;
`;

const StyledResolverContainer = styled.div`
  display: flex;
  flex-grow: 1;
  contain: layout;
`;

export const Resolver = React.memo(function Resolver({
  className,
  selectedEvent,
}: {
  className?: string;
  selectedEvent?: ResolverEvent;
}) {
  const { timestamp } = useContext(SideEffectContext);

  const { processNodePositions, connectingEdgeLineSegments } = useSelector(
    selectors.visibleProcessNodePositionsAndEdgeLineSegments
  )(timestamp());

  const dispatch: (action: ResolverAction) => unknown = useDispatch();
  const { processToAdjacencyMap } = useSelector(selectors.processAdjacencies);
  const { projectionMatrix, ref, onMouseDown } = useCamera();
  const isLoading = useSelector(selectors.isLoading);
  const hasError = useSelector(selectors.hasError);
  const relatedEventsStats = useSelector(selectors.relatedEventsStats);
  const activeDescendantId = useSelector(selectors.uiActiveDescendantId);
  const terminatedProcesses = useSelector(selectors.terminatedProcesses);
  const { colorMap } = useResolverTheme();

  useLayoutEffect(() => {
    dispatch({
      type: 'userChangedSelectedEvent',
      payload: { selectedEvent },
    });
  }, [dispatch, selectedEvent]);

  return (
    <StyledResolver
      data-test-subj="resolverEmbeddable"
      className={className}
      backgroundColor={colorMap.resolverBackground}
    >
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
        <StyledResolverContainer
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
          {[...processNodePositions].map(([processEvent, position], index) => {
            const adjacentNodeMap = processToAdjacencyMap.get(processEvent);
            const processEntityId = entityId(processEvent);
            if (!adjacentNodeMap) {
              // This should never happen
              throw new Error('Issue calculating adjacency node map.');
            }
            return (
              <ProcessEventDot
                key={index}
                position={position}
                projectionMatrix={projectionMatrix}
                event={processEvent}
                adjacentNodeMap={adjacentNodeMap}
                relatedEventsStats={relatedEventsStats.get(entityId(processEvent))}
                isProcessTerminated={terminatedProcesses.has(processEntityId)}
                isProcessOrigin={false}
              />
            );
          })}
        </StyledResolverContainer>
      )}
      <StyledPanel />
      <GraphControls />
      <SymbolDefinitions />
    </StyledResolver>
  );
});
