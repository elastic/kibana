/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';

import { i18n } from '@kbn/i18n';

import React, { memo } from 'react';

interface StyledSVGCube {
  readonly isOrigin?: boolean;
}
import { useCubeAssets } from '../use_cube_assets';
import { useSymbolIDs } from '../use_symbol_ids';
import type { NodeDataStatus } from '../../types';

/**
 * Icon representing a process node.
 */
// eslint-disable-next-line react/display-name
export const CubeForProcess = memo(function ({
  id,
  className,
  size = '2.15em',
  state,
  isOrigin,
  'data-test-subj': dataTestSubj,
}: {
  id: string;
  'data-test-subj'?: string;
  /**
   * The state of the process's node data (for endpoint the process's lifecycle events)
   */
  state: NodeDataStatus;
  /** The css size (px, em, etc...) for the width and height of the svg cube. Defaults to 2.15em */
  size?: string;
  isOrigin?: boolean;
  className?: string;
}) {
  const { cubeSymbol, strokeColor } = useCubeAssets(id, state, false);
  const { processCubeActiveBacking } = useSymbolIDs({ id });

  return (
    <StyledSVG
      className={className}
      width={size}
      height={size}
      viewBox="0 0 34 34"
      data-test-subj={dataTestSubj}
      isOrigin={isOrigin}
      style={{ verticalAlign: 'middle' }}
    >
      <desc>
        {i18n.translate('xpack.securitySolution.resolver.node_icon', {
          defaultMessage: `{state, select, running {Running Process} terminated {Terminated Process} loading {Loading Process} error {Error Process} other {Unknown Process State}}`,
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
