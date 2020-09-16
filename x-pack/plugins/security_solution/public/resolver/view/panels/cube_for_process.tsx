/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

import { i18n } from '@kbn/i18n';

/* eslint-disable react/display-name */

import React, { memo } from 'react';
import { useResolverTheme, SymbolIds } from '../assets';

interface StyledSVGCube {
  readonly isOrigin: boolean;
}

/**
 * Icon representing a process node.
 */
export const CubeForProcess = memo(function ({
  running,
  isOrigin,
  'data-test-subj': dataTestSubj,
}: {
  'data-test-subj'?: string;
  /**
   * True if the process represented by the node is still running.
   */
  running: boolean;
  isOrigin: boolean;
}) {
  const { cubeAssetsForNode } = useResolverTheme();
  const { cubeSymbol, strokeColor } = cubeAssetsForNode(!running, false);

  return (
    <StyledSVG
      width="2.15em"
      height="2.15em"
      viewBox="0 0 100% 100%"
      data-test-subj={dataTestSubj}
      isOrigin={isOrigin}
    >
      <desc>
        {i18n.translate('xpack.securitySolution.resolver.node_icon', {
          defaultMessage: '{running, select, true {Running Process} false {Terminated Process}}',
          values: { running },
        })}
      </desc>
      {isOrigin && (
        <use
          xlinkHref={`#${SymbolIds.processCubeActiveBacking}`}
          fill="transparent"
          x={0}
          y={-1}
          stroke={strokeColor}
          strokeDashoffset={0}
          width="100%"
          height="100%"
          className="origin"
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
