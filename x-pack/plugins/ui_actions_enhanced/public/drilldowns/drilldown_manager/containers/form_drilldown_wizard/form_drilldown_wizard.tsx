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

export interface FormDrilldownWizardProps {
  mode?: 'create' | 'edit';
  // drilldownActionFactories: ActionFactory[];

  // onSubmit?: (drilldownWizardConfig: Required<DrilldownWizardState>) => void;
  // onDelete?: () => void;
  // onClose?: () => void;
  // onBack?: () => void;

  // initialDrilldownWizardConfig?: DrilldownWizardState<CurrentActionConfig>;

  // actionFactoryPlaceContext?: ActionFactoryPlaceContext<ActionFactoryContext>;

  /**
   * General overview of drilldowns
   */
  // docsLink?: string;

  /**
   * Link that explains different triggers
   */
  // triggerPickerDocsLink?: string;

  // getTrigger: (triggerId: string) => Trigger;

  /**
   * List of possible triggers in current context
   */
  // supportedTriggers: string[];
}

export const FormDrilldownWizard: React.FC<FormDrilldownWizardProps> = ({ mode }) => {
  const manager = useDrilldownManager();

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
      <FormDrilldownWizardUi
        name={manager.drilldownName}
        onNameChange={manager.setDrilldownName}
        actionConfig={manager.actionConfig}
        onActionConfigChange={manager.setActionConfig}
        currentActionFactory={manager.actionFactory}
        onActionFactoryChange={manager.setActionFactory}
        actionFactories={manager.actionFactories}
        // actionFactoryContext={manager.placeContext}
        actionFactoryContext={{
          triggers: [],
        }}
        onSelectedTriggersChange={manager.setSelectedTriggers}
        triggers={manager.triggers}
        getTriggerInfo={manager.getTrigger}
        triggerPickerDocsLink={manager.triggerPickerDocsLink}
      />
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
