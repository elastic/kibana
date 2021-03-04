/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { DrilldownManagerTitle } from '../drilldown_manager_title';
import { Tabs } from '../tabs';
import { txtDrilldowns } from './i18n';

export const DrilldownManagerContent: React.FC = ({}) => {
  return (
    <>
      <DrilldownManagerTitle>{txtDrilldowns}</DrilldownManagerTitle>
      <Tabs />
    </>
  );
};
