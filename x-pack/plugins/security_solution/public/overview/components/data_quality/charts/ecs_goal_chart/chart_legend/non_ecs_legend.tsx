/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { GoalChartLegend } from './goal_chart_legend';
import * as i18n from '../../../data_quality_panel/index_properties/translations';

const NonEcsLegendComponent: React.FC = () => (
  <GoalChartLegend textAlign="center">
    <div>{i18n.PRE_BUILT_DETECTION_ENGINE_RULES_WONT_WORK}</div>
    <div>{i18n.PAGES_MAY_NOT_DISPLAY_EVENTS}</div>
    <div>{i18n.TIMELINE_AND_TEMPLATES_MAY_NOT_OPERATE_PROPERLY}</div>
    <div>{i18n.CUSTOM_DETECTION_ENGINE_RULES_WORK}</div>
  </GoalChartLegend>
);

NonEcsLegendComponent.displayName = 'NonEcsLegendComponent';

export const NonEcsLegend = React.memo(NonEcsLegendComponent);
