/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  DefaultMonitoringOutputBadge as DefaultMonitoringOutputBadgeComponent,
  DefaultOutputBadge as DefaultOutputBadgeComponent,
  DefaultBadges as Component,
} from './badges';

export default {
  component: Component,
  subcomponents: {
    DefaultMonitoringOutputBadge: DefaultMonitoringOutputBadgeComponent,
    DefaultOutputBadge: DefaultOutputBadgeComponent,
  },
  title: 'Sections/Fleet/Settings/OutputsTable/DefaultBadges',
};

export const DefaultBadges = () => {
  return (
    <div style={{ maxWidth: '200px' }}>
      <Component output={{ is_default: true, is_default_monitoring: true }} />
    </div>
  );
};

export const DefaultMonitoringOutputBadge = () => {
  return <DefaultMonitoringOutputBadgeComponent />;
};

export const DefaultOutputBadge = () => {
  return <DefaultOutputBadgeComponent />;
};
