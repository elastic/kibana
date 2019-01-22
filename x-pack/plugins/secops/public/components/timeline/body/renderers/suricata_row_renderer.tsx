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
import { Ecs } from '../../../../graphql/types';
import * as i18n from './translations';

export const dropInEffect = keyframes`
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
  border-color: transparent;
  border-top: 1px solid #98a2b3;
  border-right: 1px solid #98a2b3;
  border-bottom: 1px solid #98a2b3;
  border-left: 2px solid #8ecce3;
  overflow: hidden;
  padding-top: 5px;
  padding-bottom: 5px;
  margin-left: -1px;
  &:hover {
    border: 1px solid;
    border-color: #d9d9d9;
    border-left: 2px solid #8ecce3;
    box-shadow: 0 2px 2px -1px rgba(153, 153, 153, 0.3), 0 1px 5px -2px rgba(153, 153, 153, 0.3);
  }
`;

const SuricataSignature = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-top: 5px;
`;

const Details = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin: 5px;
  min-width: 340px;
`;

const LabelValuePairContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
`;

const Label = styled.div`
  font-weight: bold;
`;

interface LabelValuePairParams {
  label: string;
  ariaLabel: string;
  value: string;
}

const LabelValuePair = ({ label, ariaLabel, value }: LabelValuePairParams) => (
  <LabelValuePairContainer>
    <Label>{label}</Label>
    <div aria-label={ariaLabel}>{value}</div>
  </LabelValuePairContainer>
);

export const suricataRowRenderer: RowRenderer = {
  isInstance: (ecs: Ecs) => {
    if (ecs && ecs.event && ecs.event.module && ecs.event.module.toLowerCase() === 'suricata') {
      return true;
    }
    return false;
  },
  renderRow: (data: Ecs, children: React.ReactNode) => {
    const signature = get('suricata.eve.alert.signature', data) as string;
    return (
      <SuricataRow>
        {children}
        {signature != null ? (
          <SuricataSignature>
            <EuiButton fill size="s" href={createLinkWithSignature(signature)} target="_blank">
              {signature}
            </EuiButton>
            <Details>
              <LabelValuePair label={i18n.PROTOCOL} ariaLabel={i18n.PROTOCOL} value={i18n.TCP} />
              <LabelValuePair
                label={i18n.SOURCE}
                ariaLabel={i18n.SOURCE}
                value={`${data.source!.ip}:${data.source!.port}`}
              />
              <LabelValuePair
                label={i18n.DESTINATION}
                ariaLabel={i18n.DESTINATION}
                value={`${data.destination!.ip}:${data.destination!.port}`}
              />
            </Details>
          </SuricataSignature>
        ) : null}
      </SuricataRow>
    );
  },
};
