/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useLayoutEffect } from 'react';
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
import { SymbolDefinitions, NamedColors } from './defs';
import { ResolverAction } from '../types';
import { ResolverEvent } from '../../../../common/types';

const StyledPanel = styled(Panel)`
  position: absolute;
  left: 1em;
  top: 1em;
  max-height: calc(100% - 2em);
  overflow: auto;
  width: 25em;
  max-width: 50%;
`;

const StyledGraphControls = styled(GraphControls)`
  position: absolute;
  top: 5px;
  right: 5px;
`;

const StyledResolverContainer = styled.div`
  display: flex;
  flex-grow: 1;
  contain: layout;
`;

const bgColor = NamedColors.resolverBackground;

export const Resolver = styled(
  React.memo(function Resolver({
    className,
    selectedEvent,
  }: {
    className?: string;
    selectedEvent?: ResolverEvent;
  }) {
    const { processNodePositions, edgeLineSegments } = useSelector(
      selectors.processNodePositionsAndEdgeLineSegments
    );

    const dispatch: (action: ResolverAction) => unknown = useDispatch();
    const { processToAdjacencyMap } = useSelector(selectors.processAdjacencies);

    const { projectionMatrix, ref, onMouseDown } = useCamera();
    const isLoading = useSelector(selectors.isLoading);
    const hasError = useSelector(selectors.hasError);
    const activeDescendantId = useSelector(selectors.uiActiveDescendantId);

    useLayoutEffect(() => {
      dispatch({
        type: 'userChangedSelectedEvent',
        payload: { selectedEvent },
      });
    }, [dispatch, selectedEvent]);

    return (
      <div data-test-subj="resolverEmbeddable" className={className}>
        {isLoading ? (
          <div className="loading-container">
            <EuiLoadingSpinner size="xl" />
          </div>
        ) : hasError ? (
          <div className="loading-container">
            <div>
              {' '}
              <FormattedMessage
                id="xpack.endpoint.resolver.loadingError"
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
            {edgeLineSegments.map(([startPosition, endPosition], index) => (
              <EdgeLine
                key={index}
                startPosition={startPosition}
                endPosition={endPosition}
                projectionMatrix={projectionMatrix}
              />
            ))}
            {[...processNodePositions].map(([processEvent, position], index) => {
              const adjacentNodeMap = processToAdjacencyMap.get(processEvent);
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
                />
              );
            })}
          </StyledResolverContainer>
        )}
        <StyledPanel />
        <StyledGraphControls />
        <SymbolDefinitions />
      </div>
    );
  })
)`
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
  background-color: ${bgColor};
`;
