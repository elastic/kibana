/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { InfraWaffleMapNode, InfraWaffleOptions } from '../../lib/lib';
import { darken } from './lib/darken';

interface Props {
  onDrilldown: () => void;
  squareSize: number;
  options: InfraWaffleOptions;
  node: InfraWaffleMapNode;
  formatter: (val: number) => string;
}

export const Node: React.SFC<Props> = ({ node, formatter, squareSize }) => {
  const metric = node.metrics.find(m => m.name === 'count');
  const valueMode = squareSize > 75;
  const label = 'Count';
  const value = metric != null ? formatter(metric.value) : 'n/a';
  return (
    <EuiToolTip position="top" content={`${node.name} | ${value}`}>
      <Container style={{ width: squareSize, height: squareSize }}>
        <SquareOuter>
          <SquareInner>
            {valueMode && (
              <ValueInner>
                <Label>{label}</Label>
                <Value>{value}</Value>
              </ValueInner>
            )}
          </SquareInner>
        </SquareOuter>
      </Container>
    </EuiToolTip>
  );
};

export const Container = styled.div`
  position: relative;
`;
export const SquareOuter = styled.div`
  position: absolute;
  top: 4px;
  left: 4px;
  bottom: 4px;
  right: 4px;
  background-color: ${props => darken(props.theme.eui.euiColorVis0, 0.35)};
  border-radius: 3px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
`;
export const SquareInner = styled.div`
  cursor: pointer;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 2px;
  left: 0;
  border-radius: 3px;
  background-color: ${props => props.theme.eui.euiColorVis0};
`;
export const ValueInner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  line-height: 1.2em;
  align-items: center;
  align-content: center;
  padding: 1em;
  overflow: hidden;
  flex-wrap: wrap;
`;
export const Value = styled.div`
  font-weight: bold;
  font-size: 1.5em;
  text-align: center;
  width: 100%;
  flex: 1 0 auto;
  line-height: 1.2em;
`;
export const Label = styled.div`
  text-overflow: ellipsis;
  font-size: 0.7em;
  margin-bottom: 0.7em;
  text-align: center;
  width: 100%;
  flex: 1 0 auto;
  white-space: nowrap;
  overflow: hidden;
`;
