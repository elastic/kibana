/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { DrilldownManagerTitle } from '../drilldown_manager_title';
import { useDrilldownManager } from '../context';
import { CreateDrilldownFormWithState } from './create_drilldown_form_with_state';
import { ActionFactoryPicker } from '../action_factory_picker';

export const txtCreateDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.containers.createDrilldownForm.title',
  {
    defaultMessage: 'Create Drilldown',
    description: 'Drilldowns flyout title for new drilldown form.',
  }
);

export const CreateDrilldownForm: React.FC = ({ children }) => {
  const drilldowns = useDrilldownManager();
  const drilldownState = drilldowns.getDrilldownState();

  return (
    <>
      <DrilldownManagerTitle>{txtCreateDrilldown}</DrilldownManagerTitle>
      <ActionFactoryPicker />
      {!!drilldownState && <CreateDrilldownFormWithState state={drilldownState} />}
    </>
  );
};
