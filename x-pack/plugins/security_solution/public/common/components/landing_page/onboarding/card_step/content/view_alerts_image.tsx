/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import viewAlerts from '../../images/view_alerts.png';
import { VIEW_ALERTS_TITLE } from '../../translations';
import { ContentWrapper } from './content_wrapper';

const ViewAlertsImageComponent = () => (
  <ContentWrapper>
    <img src={viewAlerts} alt={VIEW_ALERTS_TITLE} height="100%" width="100%" />
  </ContentWrapper>
);

export const ViewAlertsImage = React.memo(ViewAlertsImageComponent);
