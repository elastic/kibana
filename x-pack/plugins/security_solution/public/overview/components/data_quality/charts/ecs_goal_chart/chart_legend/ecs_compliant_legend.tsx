/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { GoalChartLegend } from './goal_chart_legend';
import * as i18n from '../../../data_quality_panel/index_properties/translations';

const EcsCompliantLegendContainer = styled.div`
  position: relative;
  left: -35px;
  top: 153px;
`;

const EcsCompliantLegendComponent: React.FC = () => (
  <EcsCompliantLegendContainer>
    <GoalChartLegend textAlign="left">
      <div>{i18n.ECS_COMPLIANT_MAPPINGS_ARE_FULLY_SUPPORTED}</div>
      <div>{i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WORK}</div>
      <div>{i18n.CUSTOM_DETECTION_ENGINE_RULES_WORK}</div>
      <div>{i18n.PAGES_DISPLAY_EVENTS}</div>
      <div>{i18n.OTHER_APP_CAPABILITIES_WORK_PROPERLY}</div>
    </GoalChartLegend>
  </EcsCompliantLegendContainer>
);

EcsCompliantLegendComponent.displayName = 'EcsCompliantLegendComponent';

export const EcsCompliantLegend = React.memo(EcsCompliantLegendComponent);
