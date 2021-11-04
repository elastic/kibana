/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-no-literals */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import styled from 'styled-components';

interface ChartListProps {
  items: ChartListItemProps[];
}
interface ChartListItemProps {
  label: string;
  values: number[];
}

export const ChartList = ({ items }: ChartListProps) => {
  return (
    <ChartListWrapper>
      {items.map((item, i) => (
        <ChartListItem key={i} {...item} />
      ))}
    </ChartListWrapper>
  );
};

const ChartItem = ({ values }: Pick<ChartListItemProps, 'values'>) => {
  return (
    <ChartWrapper>
      <Label>{values[0]}</Label>
      <ChartContainer>
        <ChartChild $size={values[0]} style={{ background: '#54B399' }} />
        <ChartChild $size={values[1]} style={{ background: '#E7664C' }} />
      </ChartContainer>
      <Label>{values[1]}</Label>
    </ChartWrapper>
  );
};

const ChartListItem = ({ values, label }: ChartListItemProps) => {
  return (
    <ChartListitemWrapper>
      <EuiLink href="#">{label}</EuiLink>
      <ChartItem values={values} />
    </ChartListitemWrapper>
  );
};

const Label = styled.span`
  font-size: smaller;
  display: flex;
  align-items: center;
`;
const ChartChild = styled.div<{ $size: number }>`
  flex: ${({ $size }) => $size};
`;
const ChartWrapper = styled.div`
  display: flex;
  flex: 1;
  margin-left: auto;
  width: 100%;
`;
const ChartListitemWrapper = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: 40px;
`;
const ChartContainer = styled.div`
  display: flex;
  flex: 1;
  margin: 0 5px;
`;
const ChartListWrapper = styled.div`
  display: grid;
  grid-row-gap: 15px;
`;
