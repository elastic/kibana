/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';
import React from 'react';

export interface BarSegment {
  id: string;
  left: number;
  width: number;
  color: string;
}

export function Bar({
  width,
  left,
  color,
  segments,
}: {
  width: number;
  left: number;
  color: string;
  segments?: BarSegment[];
}) {
  return (
    <ItemBar width={width} left={left} color={color}>
      {segments?.length ? (
        <CriticalPathItemBar>
          {segments.map((segment) => (
            <CriticalPathItemSegment
              key={segment.id}
              color={segment.color}
              left={segment.left}
              width={segment.width}
            />
          ))}
        </CriticalPathItemBar>
      ) : null}
    </ItemBar>
  );
}

const ItemBar = styled.div<{
  width: number;
  left: number;
  color: string;
}>`
  position: relative;
  height: ${({ theme }) => theme.euiTheme.size.base};
  background-color: ${(props) => props.color};
  width: ${(props) => props.width}%;
  margin-left: ${(props) => props.left}%;
`;

const CriticalPathItemBar = styled.div`
  box-sizing: border-box;
  position: relative;
  height: ${({ theme }) => theme.euiTheme.size.s};
  top: ${({ theme }) => theme.euiTheme.size.s};
  min-width: 2px;
  background-color: transparent;
  display: flex;
  flex-direction: row;
`;

const CriticalPathItemSegment = styled.div<{
  left: number;
  width: number;
  color: string;
}>`
  box-sizing: border-box;
  position: absolute;
  height: ${({ theme }) => theme.euiTheme.size.s};
  left: ${(props) => props.left * 100}%;
  width: ${(props) => props.width * 100}%;
  min-width: 2px;
  background-color: ${(props) => props.color};
`;
