/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDrilldownManager } from '../context';
import { DrilldownForm } from '../../components/drilldown_form';
import { DrilldownState } from '../../state';
import { TriggerPickerProps } from '../../components/trigger_picker';

export const txtDeleteDrilldownButtonLabel = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.components.flyoutDrilldownWizard.deleteDrilldownButtonLabel',
  {
    defaultMessage: 'Delete drilldown',
  }
);

export interface EditDrilldownFormProps {
  state: DrilldownState;
}

export const EditDrilldownForm: React.FC<EditDrilldownFormProps> = ({ state }) => {
  const drilldowns = useDrilldownManager();
  const name = state.useName();
  const triggers = state.useTriggers();
  const config = state.useConfig();
  const triggerPickerProps: TriggerPickerProps = React.useMemo(
    () => ({
      items: state.uiTriggers.map((id) => {
        const trigger = drilldowns.deps.getTrigger(id);
        return trigger;
      }),
      selected: triggers,
      onChange: state.setTriggers,
    }),
    [drilldowns, triggers, state]
  );
  const context = state.getFactoryContext();

  return (
    <>
      <DrilldownForm name={name} onNameChange={state.setName} triggers={triggerPickerProps}>
        <state.factory.ReactCollectConfig
          config={config}
          onConfig={state.setConfig}
          context={context}
        />
      </DrilldownForm>
      <EuiSpacer size={'xl'} />
      <EuiButton
        onClick={() => {
          alert('DELETE!');
        }}
        color={'danger'}
      >
        {txtDeleteDrilldownButtonLabel}
      </EuiButton>
    </>
  );
};
