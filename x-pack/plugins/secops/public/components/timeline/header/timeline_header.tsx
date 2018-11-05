/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DataProviders } from '../data_providers';
import { DataProvider } from '../data_providers/data_provider';
import { OnDataProviderRemoved } from '../events';

interface Props {
  dataProviders: DataProvider[];
  onDataProviderRemoved: OnDataProviderRemoved;
  width: number;
}

const Header = styled.header`
  display: 'flex';
  flex-direction: 'column';
`;

/** Renders the timeline header */
export const TimelineHeader = pure<Props>(({ dataProviders, onDataProviderRemoved, width }) => (
  <Header data-test-subj="timelineHeader" style={{ width: `${width}px` }}>
    <DataProviders dataProviders={dataProviders} onDataProviderRemoved={onDataProviderRemoved} />
  </Header>
));
