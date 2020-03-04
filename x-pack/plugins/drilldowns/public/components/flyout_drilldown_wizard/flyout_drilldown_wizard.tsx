/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormDrilldownWizard } from '../form_drilldown_wizard';
import { FlyoutFrame } from '../flyout_frame';
import {
  txtCreateDrilldownButtonLabel,
  txtCreateDrilldownTitle,
  txtDeleteDrilldownButtonLabel,
  txtEditDrilldownButtonLabel,
  txtEditDrilldownTitle,
} from './i18n';
import { FlyoutCreateDrilldownActionContext } from '../../actions';
import {
  ActionFactory,
  ActionFactoryBaseConfig,
} from '../../../../../../src/plugins/ui_actions/public';

export interface DrilldownWizardConfig {
  name: string;
  actionConfig: {
    actionFactory: ActionFactory;
    config: ActionFactoryBaseConfig;
  };
}

/**
 * Represent current wizard's form state in invalid or incomplete shape
 */
export interface PartialDrilldownWizardConfig {
  name: string;
  actionConfig: {
    actionFactory: ActionFactory | null;
    config: ActionFactoryBaseConfig | null;
  };
}

export interface FlyoutDrilldownWizardProps {
  context: FlyoutCreateDrilldownActionContext;
  onSubmit?: (drilldownWizardConfig: DrilldownWizardConfig) => void;
  onDelete?: () => void;
  onClose?: () => void;

  mode?: 'create' | 'edit';
  initialDrilldownWizardConfig?: DrilldownWizardConfig;
}

export const FlyoutDrilldownWizard: React.FC<FlyoutDrilldownWizardProps> = ({
  context,
  onClose,
  onSubmit = () => {},
  initialDrilldownWizardConfig,
  mode = 'create',
  onDelete = () => {},
}) => {
  const [wizardConfig, setWizardConfig] = useState<
    DrilldownWizardConfig | PartialDrilldownWizardConfig
  >(
    () =>
      initialDrilldownWizardConfig ?? {
        name: '',
        actionConfig: {
          actionFactory: null,
          config: null,
        },
      }
  );

  const isFormValid = (
    currentWizardConfig: PartialDrilldownWizardConfig | DrilldownWizardConfig
  ): currentWizardConfig is DrilldownWizardConfig => {
    if (!currentWizardConfig.name) {
      // name is required
      return false;
    }

    if (
      !currentWizardConfig.actionConfig.actionFactory ||
      !currentWizardConfig.actionConfig.config
    ) {
      // action factory has to be selected and config has to be present
      return false;
    }

    return true;
  };

  const footer = (
    <EuiButton
      onClick={() => {
        if (isFormValid(wizardConfig)) {
          onSubmit(wizardConfig);
        }
      }}
      fill
      isDisabled={!isFormValid(wizardConfig)}
    >
      {mode === 'edit' ? txtEditDrilldownButtonLabel : txtCreateDrilldownButtonLabel}
    </EuiButton>
  );

  return (
    <FlyoutFrame
      title={mode === 'edit' ? txtEditDrilldownTitle : txtCreateDrilldownTitle}
      footer={footer}
      onClose={onClose}
    >
      <FormDrilldownWizard
        initialName={wizardConfig.name}
        onNameChange={newName => {
          setWizardConfig({
            ...wizardConfig,
            name: newName,
          });
        }}
        initialActionConfig={wizardConfig.actionConfig}
        onActionConfigChange={(actionFactory, config) => {
          setWizardConfig({
            ...wizardConfig,
            actionConfig: {
              actionFactory,
              config,
            },
          });
        }}
      />
      {mode === 'edit' && (
        <>
          <EuiSpacer size={'xl'} />
          <EuiButton onClick={onDelete} color={'danger'}>
            {txtDeleteDrilldownButtonLabel}
          </EuiButton>
        </>
      )}
    </FlyoutFrame>
  );
};
