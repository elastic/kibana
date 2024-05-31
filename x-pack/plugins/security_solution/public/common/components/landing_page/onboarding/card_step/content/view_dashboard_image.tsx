/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import analyzeDataUsingDashboards from '../../images/analyze_data_using_dashboards.png';
import { VIEW_DASHBOARDS_IMAGE_TITLE } from '../../translations';
import { ContentWrapper } from './content_wrapper';

const ViewDashboardImageComponent = () => (
  <ContentWrapper>
    <img
      src={analyzeDataUsingDashboards}
      alt={VIEW_DASHBOARDS_IMAGE_TITLE}
      height="100%"
      width="100%"
    />
  </ContentWrapper>
);

export const ViewDashboardImage = React.memo(ViewDashboardImageComponent);
