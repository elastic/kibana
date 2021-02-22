/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// import { EuiButton, EuiSpacer } from '@elastic/eui';
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
        euiIconType={iconType}
        drilldownTypeName={drilldownTypeDisplayName}
        onTypeChange={() => drilldowns.setActionFactory(undefined)}
        name={name}
        onNameChange={state.setName}
        triggers={triggerPickerProps}
        isBeta={state.factory.isBeta}
        showMoreActionsLink={drilldowns.canUnlockMoreDrilldowns}
      >
        <state.factory.ReactCollectConfig
          config={config}
          onConfig={state.setConfig}
          context={context}
        />
      </DrilldownForm>
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
