/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';

import { i18n } from '@kbn/i18n';

/* eslint-disable react/display-name */

import React, { memo } from 'react';
import { useResolverTheme } from '../assets';

/**
 * Icon representing a process node.
 */
export const CubeForProcess = memo(function ({
  running,
  'data-test-subj': dataTestSubj,
}: {
  'data-test-subj'?: string;
  /**
   * True if the process represented by the node is still running.
   */
  running: boolean;
}) {
  const { cubeAssetsForNode } = useResolverTheme();
  const { cubeSymbol } = cubeAssetsForNode(!running, false);

  return (
    <StyledSVG width="1.5em" height="1.5em" viewBox="0 0 1 1" data-test-subj={dataTestSubj}>
      <desc>
        {i18n.translate('xpack.securitySolution.resolver.node_icon', {
          defaultMessage: '{running, select, true {Running Process} false {Terminated Process}}',
          values: { running },
        })}
      </desc>
      <use
        role="presentation"
        xlinkHref={cubeSymbol}
        x={0}
        y={0}
        width={1}
        height={1}
        opacity="1"
        className="cube"
      />
    </StyledSVG>
  );
});

const StyledSVG = styled.svg`
  position: relative;
  top: 0.4em;
  margin-right: 0.25em;
`;
