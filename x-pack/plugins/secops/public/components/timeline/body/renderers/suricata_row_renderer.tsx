/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { RowRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { SuricataDetails } from './suricata_details';

const SuricataRow = styled.div`
  width: 100%;
  overflow: hidden;
  &:hover {
    border: 1px solid ${props => props.theme.eui.euiColorMediumShade};
  }
`;

export const suricataRowRenderer: RowRenderer = {
  isInstance: (ecs: Ecs) => {
    const module: string | null = get('event.module', ecs);
    return module != null && module.toLowerCase() === 'suricata';
  },
  renderRow: (data: Ecs, children: React.ReactNode) => {
    return (
      <SuricataRow>
        {children}
        <SuricataDetails data={data} />
      </SuricataRow>
    );
  },
};
