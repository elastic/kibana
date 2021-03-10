/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { ListManageDrilldowns } from '../../components/list_manage_drilldowns';
import { useDrilldownManager } from '../context';

export const DrilldownList: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const events = drilldowns.useEvents();

  return (
    <ListManageDrilldowns
      items={events}
      onDelete={drilldowns.onDelete}
      onEdit={(id) => {
        drilldowns.setRoute(['manage', id]);
      }}
    />
  );
};
