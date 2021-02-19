/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionFactoryPicker } from '../action_factory_picker';
import { useDrilldownManager } from '../context';
import { CreateDrilldownForm } from './create_drilldown_form';

export const FormDrilldownWizard: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();

  const actionFactory = drilldowns.useActionFactory();
  if (!actionFactory) return <ActionFactoryPicker />;

  const drilldownState = drilldowns.getDrilldownState();
  if (drilldownState) return <CreateDrilldownForm state={drilldownState} />;

  return null;
};
