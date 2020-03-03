/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { FormCreateDrilldown } from '../form_create_drilldown';
import { FlyoutFrame } from '../flyout_frame';
import { txtCreateDrilldown } from './i18n';
import { FlyoutCreateDrilldownActionContext } from '../../actions';
import {
  ActionFactory,
  ActionFactoryBaseConfig,
} from '../../../../../../src/plugins/ui_actions/public';

export interface FlyoutCreateDrilldownProps {
  context: FlyoutCreateDrilldownActionContext;
  onClose?: () => void;
}

export const FlyoutCreateDrilldown: React.FC<FlyoutCreateDrilldownProps> = ({
  context,
  onClose,
}) => {
  const [state, setState] = useState<{
    name: string;
    action: {
      actionFactory: ActionFactory | null;
      config: ActionFactoryBaseConfig | null;
    };
  }>({
    name: '',
    action: {
      actionFactory: null,
      config: null,
    },
  });

  const isFormValid = () => {
    if (!state.name) {
      // name is required
      return false;
    }

    if (!state.action.actionFactory || !state.action.config) {
      // action factory has to be selected and config has to be present
      return false;
    }

    return true;
  };

  const footer = (
    <EuiButton onClick={() => {}} fill isDisabled={!isFormValid()}>
      {txtCreateDrilldown}
    </EuiButton>
  );

  return (
    <FlyoutFrame title={txtCreateDrilldown} footer={footer} onClose={onClose}>
      <FormCreateDrilldown
        name={state.name}
        onNameChange={newName => {
          setState({
            ...state,
            name: newName,
          });
        }}
        onActionChange={(actionFactory, config) => {
          setState({
            ...state,
            action: {
              actionFactory,
              config,
            },
          });
        }}
      />
    </FlyoutFrame>
  );
};
