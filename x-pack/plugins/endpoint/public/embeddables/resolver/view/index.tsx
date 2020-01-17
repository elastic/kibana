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

export const AppRoot = React.memo(({ store }: { store: Store<ResolverState, ResolverAction> }) => {
  return (
    <Provider store={store}>
      <Resolver />
    </Provider>
  );
});

const Resolver = styled(
  React.memo(({ className }: { className?: string }) => {
    const { processNodePositions, edgeLineSegments } = useSelector(
      selectors.processNodePositionsAndEdgeLineSegments
    );

    return (
      <div data-test-subj="resolverEmbeddable" className={className} {...useCamera()}>
        {Array.from(processNodePositions).map(([processEvent, position], index) => (
          <ProcessEventDot key={index} position={position} event={processEvent} />
        ))}
        {edgeLineSegments.map(([startPosition, endPosition], index) => (
          <EdgeLine key={index} startPosition={startPosition} endPosition={endPosition} />
        ))}
      </div>
    );
  })
)`
  /**
   * Take up all availble space
   */
  display: flex;
  flex-grow: 1;
  /**
   * The placeholder components use absolute positioning.
   */
  position: relative;
  /**
   * Prevent partially visible components from showing up outside the bounds of Resolver.
   */
  overflow: hidden;
`;
