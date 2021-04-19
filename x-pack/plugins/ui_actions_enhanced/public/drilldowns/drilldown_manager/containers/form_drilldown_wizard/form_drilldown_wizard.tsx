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

  const drilldownState = drilldowns.getDrilldownState();
  let content: React.ReactNode = null;

  if (!actionFactory) content = null;
  if (drilldownState) content = <CreateDrilldownForm state={drilldownState} />;

  return (
    <>
      <ActionFactoryPicker />
      {content}
    </>
  );
};
