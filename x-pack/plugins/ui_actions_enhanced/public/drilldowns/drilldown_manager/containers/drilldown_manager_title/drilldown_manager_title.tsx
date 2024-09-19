/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { useDrilldownManager } from '../context';

export const DrilldownManagerTitle: React.FC = ({ children }) => {
  const drilldowns = useDrilldownManager();
  React.useEffect(() => {
    drilldowns.setTitle(children);
    return () => {
      drilldowns.resetTitle();
    };
  });
  return null;
};

export const RenderDrilldownManagerTitle: React.FC = () => {
  const drilldowns = useDrilldownManager();
  const title = drilldowns.useTitle();
  return <>{title}</>;
};
