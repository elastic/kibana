/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import styled from 'styled-components';
import { SloCardBadges } from '../badges/slo_card_badges';
import { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';

interface Props {
  activeAlerts?: number;
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  handleCreateRule: () => void;
}

const Container = styled.div`
  position: absolute;
  display: inline-block;
  top: 35px;
  left: 8px;
  z-index: 1;
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
`;

export function SloGridItemBadges({ slo, activeAlerts, rules, handleCreateRule }: Props) {
  return (
    <Container>
      <SloCardBadges
        activeAlerts={activeAlerts}
        isLoading={!slo.summary}
        rules={rules}
        slo={slo}
        onClickRuleBadge={handleCreateRule}
      />
    </Container>
  );
}
