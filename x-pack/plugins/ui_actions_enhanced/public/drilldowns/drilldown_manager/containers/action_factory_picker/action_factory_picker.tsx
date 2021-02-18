/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionFactoryPicker as ActionFactoryPickerUi } from '../../../../components/action_factory_picker';
import { useDrilldownManager } from '../context';

export const ActionFactoryPicker: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();
  const context = React.useMemo(() => drilldowns.getActionFactoryContext(), [drilldowns]);

  return (
    <ActionFactoryPickerUi
      actionFactories={drilldowns.deps.actionFactories}
      context={context}
      onSelect={(actionFactory) => {
        drilldowns.setActionFactory(actionFactory);
      }}
    />
  );
};
