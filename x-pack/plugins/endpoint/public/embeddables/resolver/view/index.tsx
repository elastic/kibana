/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store } from 'redux';
import { Provider, useSelector } from 'react-redux';
import styled from 'styled-components';
import { useCamera } from './use_camera';
import { ResolverState, ResolverAction } from '../types';
import * as selectors from '../store/selectors';
import { ProcessEventDot } from './process_event_dot';
import { EdgeLine } from './edge_line';
import { GraphControls } from './graph_controls';
import { Event } from './event';

export const AppRoot = React.memo(({ store }: { store: Store<ResolverState, ResolverAction> }) => {
  return (
    <Provider store={store}>
      <Resolver />
    </Provider>
  );
});

const StyledEvent = styled(Event)`
  position: absolute;
  left: 1em;
  top: 1em;
  width: 30em;
  max-width: 50%;
`;

const StyledGraphControls = styled(GraphControls)`
  position: absolute;
  top: 5px;
  right: 5px;
`;

const Resolver = styled(
  React.memo(function Resolver({ className }: { className?: string }) {
    const { processNodePositions, edgeLineSegments } = useSelector(
      selectors.processNodePositionsAndEdgeLineSegments
    );

    const { projectionMatrix, ref, onMouseDown } = useCamera();

    return (
      <div data-test-subj="resolverEmbeddable" className={className}>
        <div className="resolver-graph" onMouseDown={onMouseDown} ref={ref}>
          {Array.from(processNodePositions).map(([processEvent, position], index) => (
            <ProcessEventDot
              key={index}
              position={position}
              projectionMatrix={projectionMatrix}
              event={processEvent}
            />
          ))}
          {edgeLineSegments.map(([startPosition, endPosition], index) => (
            <EdgeLine
              key={index}
              startPosition={startPosition}
              endPosition={endPosition}
              projectionMatrix={projectionMatrix}
            />
          ))}
        </div>
        <StyledEvent />
        <StyledGraphControls />
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
  /**
   * The placeholder components use absolute positioning.
   */
  position: relative;
  /**
   * Prevent partially visible components from showing up outside the bounds of Resolver.
   */
  overflow: hidden;
`;
