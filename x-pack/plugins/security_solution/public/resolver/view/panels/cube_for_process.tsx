/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

import { i18n } from '@kbn/i18n';

/* eslint-disable react/display-name */

import React, { memo } from 'react';

interface StyledSVGCube {
  readonly isOrigin?: boolean;
}
import { useCubeAssets } from '../use_cube_assets';
import { useSymbolIDs } from '../use_symbol_ids';
import { NodeDataStatus } from '../../types';

/**
 * Icon representing a process node.
 */
export const CubeForProcess = memo(function ({
  className,
  size = '2.15em',
  state,
  isOrigin,
  'data-test-subj': dataTestSubj,
}: {
  'data-test-subj'?: string;
  /**
   * 'running' if the process represented by the node is still running.
   * 'loading' if we don't have the data yet to determine if the node is running or terminated.
   * 'terminated' if the process represented by the node is terminated.
   * 'error' if we were unable to retrieve data associated with the node.
   */
  state: NodeDataStatus;
  /** The css size (px, em, etc...) for the width and height of the svg cube. Defaults to 2.15em */
  size?: string;
  isOrigin?: boolean;
  className?: string;
}) {
  const { cubeSymbol, strokeColor } = useCubeAssets(state, false);
  const { processCubeActiveBacking } = useSymbolIDs();

  return (
    <StyledSVG
      className={className}
      width={size}
      height={size}
      viewBox="0 0 34 34"
      data-test-subj={dataTestSubj}
      isOrigin={isOrigin}
    >
      <desc>
        {i18n.translate('xpack.securitySolution.resolver.node_icon', {
          defaultMessage: `{state, select, running {Running Process} terminated {Terminated Process} loading {Loading Process} error {Error Process}}`,
          values: { state },
        })}
      </desc>
      {isOrigin && (
        <use
          xlinkHref={`#${processCubeActiveBacking}`}
          fill="transparent"
          x={0}
          y={-1}
          stroke={strokeColor}
          strokeDashoffset={0}
          width="100%"
          height="100%"
        />
      )}
      <use
        role="presentation"
        xlinkHref={cubeSymbol}
        x={5.25}
        y={4.25}
        width="70%"
        height="70%"
        opacity="1"
        className="cube"
      />
    </StyledSVG>
  );
});

const StyledSVG = styled.svg<StyledSVGCube>`
  margin-right: ${(props) => (props.isOrigin ? '0.15em' : 0)};
`;
