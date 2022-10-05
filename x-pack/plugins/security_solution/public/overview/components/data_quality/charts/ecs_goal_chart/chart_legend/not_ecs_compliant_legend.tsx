/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

const NotEcsCompliantLegendContainer = styled.div`
  position: relative;
  left: 35px;
  top: 153px;
`;

import { GoalChartLegend } from './goal_chart_legend';
import * as i18n from '../../../data_quality_panel/index_properties/translations';

const NotEcsCompliantLegendComponent: React.FC = () => (
  <NotEcsCompliantLegendContainer>
    <GoalChartLegend textAlign="right">
      <div>{i18n.MAPPINGS_THAT_CONFLICT_WITH_ECS}</div>
      <div>{i18n.DETECTION_ENGINE_RULES_WONT_WORK}</div>
      <div>{i18n.PAGES_WONT_DISPLAY_EVENTS}</div>
    </GoalChartLegend>
  </NotEcsCompliantLegendContainer>
);

NotEcsCompliantLegendComponent.displayName = 'NotEcsCompliantLegendComponent';

export const NotEcsCompliantLegend = React.memo(NotEcsCompliantLegendComponent);
