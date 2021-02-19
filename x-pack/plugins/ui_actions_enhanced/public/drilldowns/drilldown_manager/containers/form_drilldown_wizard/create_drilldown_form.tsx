/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionFactoryPicker } from '../action_factory_picker';
// import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormDrilldownWizard as FormDrilldownWizardUi } from '../../components/form_drilldown_wizard';
// import { txtDeleteDrilldownButtonLabel } from './i18n';
// import {
// ActionFactory,
// BaseActionConfig,
// BaseActionFactoryContext,
// } from '../../../dynamic_actions';
import { useDrilldownManager } from '../context';
import { DrilldownForm } from '../../components/drilldown_form';
import { DrilldownState } from '../../state';
import { TriggerPickerProps } from '../../components/trigger_picker';
// import { Trigger } from '../../../../../../../src/plugins/ui_actions/public';
// import { ActionFactoryPlaceContext } from '../types';
// import { DrilldownWizardState, useDrilldownWizard } from './use_flyout_drilldown_wizard';

export interface CreateDrilldownFormProps {
  state: DrilldownState;
}

export const CreateDrilldownForm: React.FC<CreateDrilldownFormProps> = ({ state }) => {
  const drilldowns = useDrilldownManager();
  const name = state.useName();
  const triggers = state.useTriggers();
  const config = state.useConfig();
  const triggerPickerProps: TriggerPickerProps = React.useMemo(
    () => ({
      items: drilldowns.deps.triggers.map((id) => {
        const trigger = drilldowns.deps.getTrigger(id);
        return trigger;
      }),
      selected: triggers,
      onChange: state.setTriggers,
    }),
    [drilldowns, triggers, state]
  );
  const context = state.getFactoryContext();
  const drilldownTypeDisplayName = state.factory.getDisplayName(context);
  const iconType = state.factory.getIconType(context);

  return (
    <>
      <DrilldownForm
        drilldownTypeName={drilldownTypeDisplayName}
        euiIconType={iconType}
        name={name}
        onNameChange={state.setName}
        triggers={triggerPickerProps}
        onTypeChange={() => drilldowns.setActionFactory(undefined)}
      />
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
