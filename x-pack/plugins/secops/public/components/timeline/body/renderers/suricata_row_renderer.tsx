/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';
import styled, { keyframes } from 'styled-components';
import { createLinkWithSignature, RowRenderer } from '.';
import { ECS } from '../../ecs';

const SuricataSignature = styled.div`
  margin-top: 10px;
  margin-left: 30px;
`;

const dropInEffect = keyframes`
  0% {
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.050);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }

  35%, 80% {
    border: 1px solid;
    border-color: #d9d9d9;
    transform: scale(1.010);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }

  100% {
    border-color: transparent;
    border-left: 2px solid #8ecce3;
    transform: scale(1);
    box-shadow: unset;
  }
`;

const SuricataRow = styled.div`
  width: 100%;
  background: #f0f8ff;
  border-color: transparent;
  border-left: 2px solid #8ecce3;
  padding-top: 10px;
  padding-bottom: 20px;
  animation: ${dropInEffect} 2s;
  margin-left -1px;
  transition: 700ms background, 700ms border-color, 1s transform, 1s box-shadow;
  transition-delay: 0s;
  &:hover {
    background: #f0f8ff;
    border: 1px solid;
    border-color: #d9d9d9;
    border-left: 2px solid #8ecce3;
    transform: scale(1.025);
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }
`;

export const suricataRowRenderer: RowRenderer = {
  isInstance: (ecs: ECS) => (ecs.event.module.toLowerCase() === 'suricata' ? true : false),
  renderRow: (data: ECS, children: React.ReactNode) => {
    const signature = get('suricata.eve.alert.signature', data) as string;
    if (signature != null) {
      return (
        <SuricataRow>
          {children}
          <SuricataSignature>
            <EuiButton fill size="s" href={createLinkWithSignature(signature)}>
              {signature}
            </EuiButton>
          </SuricataSignature>
        </SuricataRow>
      );
    } else {
      return <span />;
    }
  },
};
