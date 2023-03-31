/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { INSIGHTS_TEST_ID } from './test_ids';
import { INSIGHTS_TITLE } from './translations';
import type { OverviewSectionProps } from '../types';
import { OverviewHeader } from './overview_header';
import { EntitiesOverview } from './entities_overview';

const Wrapper = styled.div``;

export const Insights: React.FC<OverviewSectionProps> = ({ expanded = false }) => {
  return (
    <Wrapper data-test-subj={INSIGHTS_TEST_ID}>
      <OverviewHeader title={INSIGHTS_TITLE} expanded={expanded}>
        <EntitiesOverview />
      </OverviewHeader>
    </Wrapper>
  );
};

Insights.displayName = 'Insights';
