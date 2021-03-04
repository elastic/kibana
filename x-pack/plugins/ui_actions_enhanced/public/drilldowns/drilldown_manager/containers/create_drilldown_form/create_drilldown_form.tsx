/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { DrilldownManagerTitle } from '../drilldown_manager_title';
import { useDrilldownManager } from '../context';
import { ActionFactoryPicker } from '../action_factory_picker';
import { DrilldownManagerFooter } from '../drilldown_manager_footer';
import { DrilldownStateForm } from './drilldown_state_form';

const txtCreateDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.containers.createDrilldownForm.title',
  {
    defaultMessage: 'Create Drilldown',
    description: 'Drilldowns flyout title for new drilldown form.',
  }
);

const txtCreateDrilldownButtonLabel = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.containers.createDrilldownForm.primaryButton',
  {
    defaultMessage: 'Create drilldown',
    description: 'Primary button on new drilldown creation form.',
  }
);

export const CreateDrilldownForm: React.FC = () => {
  const drilldowns = useDrilldownManager();
  const drilldownState = drilldowns.getDrilldownState();

  return (
    <>
      <DrilldownManagerTitle>{txtCreateDrilldown}</DrilldownManagerTitle>
      <ActionFactoryPicker />
      {!!drilldownState && <DrilldownStateForm state={drilldownState} />}
      {!!drilldownState && (
        <DrilldownManagerFooter>
          <EuiButton
            onClick={drilldowns.onCreateDrilldown}
            fill
            // isDisabled={!isActionValid(wizardConfig)}
            data-test-subj={'drilldownWizardSubmit'}
          >
            {txtCreateDrilldownButtonLabel}
          </EuiButton>
        </DrilldownManagerFooter>
      )}
    </>
  );
};
