/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { RowRenderer, RowRendererContainer } from '.';
import { SuricataDetails } from './suricata_details';

const SuricataRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    background-color: ${props => props.theme.eui.euiTableHoverColor};
  }
`;

export const suricataRowRenderer: RowRenderer = {
  isInstance: ecs => {
    const module: string | null = get('event.module', ecs);
    return module != null && module.toLowerCase() === 'suricata';
  },
  renderRow: ({ browserFields, data, width, children }) => {
    return (
      <SuricataRow>
        {children}
        <RowRendererContainer width={width}>
          <SuricataDetails data={data} browserFields={browserFields} />
        </RowRendererContainer>
      </SuricataRow>
    );
  },
};
