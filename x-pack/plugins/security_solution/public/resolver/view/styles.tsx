/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import styled from 'styled-components';
import { Panel } from './panel';

/**
 * The top level DOM element for Resolver
 * NB: `styled-components` may be used to wrap this.
 */
export const StyledMapContainer = styled.div<{ backgroundColor: string }>`
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

/**
 * The Panel, styled for use in `ResolverMap`.
 */
export const StyledPanel = styled(Panel)`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  overflow: auto;
  width: 25em;
  max-width: 50%;
  border-radius: 0;
  border-top: none;
`;

/**
 * Used by ResolverMap to contain the lines and nodes.
 */
export const GraphContainer = styled.div`
  display: flex;
  flex-grow: 1;
  contain: layout;
`;
