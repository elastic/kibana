/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormDrilldownWizard as FormDrilldownWizardUi } from '../../components/form_drilldown_wizard';
// import { txtDeleteDrilldownButtonLabel } from './i18n';
// import {
// ActionFactory,
// BaseActionConfig,
// BaseActionFactoryContext,
// } from '../../../dynamic_actions';
import { useDrilldownManager } from '../context';
// import { Trigger } from '../../../../../../../src/plugins/ui_actions/public';
// import { ActionFactoryPlaceContext } from '../types';
// import { DrilldownWizardState, useDrilldownWizard } from './use_flyout_drilldown_wizard';

export const FormDrilldownWizard: React.FC = ({}) => {
  const drilldowns = useDrilldownManager();

  // const [
  //   wizardConfig,
  //   { setActionFactory, setActionConfig, setName, setSelectedTriggers },
  // ] = useDrilldownWizard(
  //   { ...actionFactoryPlaceContext, triggers: supportedTriggers },
  //   initialDrilldownWizardConfig
  // );

  // const actionFactoryContext: BaseActionFactoryContext = useMemo(
  //   () => ({
  //     ...actionFactoryPlaceContext,
  //     triggers: wizardConfig.selectedTriggers ?? [],
  //   }),
  //   [actionFactoryPlaceContext, wizardConfig.selectedTriggers]
  // );

  return (
    <>
      <div>wizard...</div>
      {/* <FormDrilldownWizardUi
        name={drilldowns.drilldownName}
        onNameChange={drilldowns.setDrilldownName}
        actionConfig={drilldowns.actionConfig}
        onActionConfigChange={drilldowns.setActionConfig}
        currentActionFactory={drilldowns.actionFactory}
        onActionFactoryChange={drilldowns.setActionFactory}
        actionFactories={drilldowns.actionFactories}
        // actionFactoryContext={manager.placeContext}
        actionFactoryContext={{
          triggers: [],
        }}
        onSelectedTriggersChange={drilldowns.setSelectedTriggers}
        triggers={drilldowns.triggers}
        getTriggerInfo={drilldowns.getTrigger}
        triggerPickerDocsLink={drilldowns.triggerPickerDocsLink}
      /> */}
      {/* {mode === 'edit' && (
        <>
          <EuiSpacer size={'xl'} />
          <EuiButton onClick={onDelete} color={'danger'}>
            {txtDeleteDrilldownButtonLabel}
          </EuiButton>
        </>
      )} */}
    </>
  );
};
