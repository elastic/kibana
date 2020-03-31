/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiKeyPadMenuItem,
} from '@elastic/eui';
import { txtChangeButton } from './i18n';
import './action_wizard.scss';

// TODO: this interface is temporary for just moving forward with the component
// and it will be imported from the ../ui_actions when implemented properly
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ActionBaseConfig = {};
export interface ActionFactory<Config extends ActionBaseConfig = ActionBaseConfig> {
  type: string; // TODO: type should be tied to Action and ActionByType
  displayName: string;
  iconType?: string;
  wizard: React.FC<ActionFactoryWizardProps<Config>>;
  createConfig: () => Config;
  isValid: (config: Config) => boolean;
}

export interface ActionFactoryWizardProps<Config extends ActionBaseConfig> {
  config?: Config;

  /**
   * Callback called when user updates the config in UI.
   */
  onConfig: (config: Config) => void;
}

export interface ActionWizardProps {
  /**
   * List of available action factories
   */
  actionFactories: Array<ActionFactory<any>>; // any here to be able to pass array of ActionFactory<Config> with different configs

  /**
   * Currently selected action factory
   * undefined - is allowed and means that non is selected
   */
  currentActionFactory?: ActionFactory;
  /**
   * Action factory selected changed
   * null - means user click "change" and removed action factory selection
   */
  onActionFactoryChange: (actionFactory: ActionFactory | null) => void;

  /**
   * current config for currently selected action factory
   */
  config?: ActionBaseConfig;

  /**
   * config changed
   */
  onConfigChange: (config: ActionBaseConfig) => void;
}

export const ActionWizard: React.FC<ActionWizardProps> = ({
  currentActionFactory,
  actionFactories,
  onActionFactoryChange,
  onConfigChange,
  config,
}) => {
  // auto pick action factory if there is only 1 available
  if (!currentActionFactory && actionFactories.length === 1) {
    onActionFactoryChange(actionFactories[0]);
  }

  if (currentActionFactory && config) {
    return (
      <SelectedActionFactory
        actionFactory={currentActionFactory}
        showDeselect={actionFactories.length > 1}
        onDeselect={() => {
          onActionFactoryChange(null);
        }}
        config={config}
        onConfigChange={newConfig => {
          onConfigChange(newConfig);
        }}
      />
    );
  }

  return (
    <ActionFactorySelector
      actionFactories={actionFactories}
      onActionFactorySelected={actionFactory => {
        onActionFactoryChange(actionFactory);
      }}
    />
  );
};

interface SelectedActionFactoryProps<Config extends ActionBaseConfig = ActionBaseConfig> {
  actionFactory: ActionFactory<Config>;
  config: Config;
  onConfigChange: (config: Config) => void;
  showDeselect: boolean;
  onDeselect: () => void;
}

export const TEST_SUBJ_SELECTED_ACTION_FACTORY = 'selected-action-factory';

const SelectedActionFactory: React.FC<SelectedActionFactoryProps> = ({
  actionFactory,
  onDeselect,
  showDeselect,
  onConfigChange,
  config,
}) => {
  return (
    <div
      className="auaActionWizard__selectedActionFactoryContainer"
      data-test-subj={TEST_SUBJ_SELECTED_ACTION_FACTORY}
      data-testid={TEST_SUBJ_SELECTED_ACTION_FACTORY}
    >
      <header>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          {actionFactory.iconType && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionFactory.iconType} size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>{actionFactory.displayName}</h4>
            </EuiText>
          </EuiFlexItem>
          {showDeselect && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" onClick={() => onDeselect()}>
                {txtChangeButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </header>
      <EuiSpacer size="m" />
      <div>
        {actionFactory.wizard({
          config,
          onConfig: onConfigChange,
        })}
      </div>
    </div>
  );
};

interface ActionFactorySelectorProps {
  actionFactories: ActionFactory[];
  onActionFactorySelected: (actionFactory: ActionFactory) => void;
}

export const TEST_SUBJ_ACTION_FACTORY_ITEM = 'action-factory-item';

const ActionFactorySelector: React.FC<ActionFactorySelectorProps> = ({
  actionFactories,
  onActionFactorySelected,
}) => {
  if (actionFactories.length === 0) {
    // this is not user facing, as it would be impossible to get into this state
    // just leaving for dev purposes for troubleshooting
    return <div>No action factories to pick from</div>;
  }

  return (
    <EuiFlexGroup wrap>
      {actionFactories.map(actionFactory => (
        <EuiKeyPadMenuItem
          className="auaActionWizard__actionFactoryItem"
          key={actionFactory.type}
          label={actionFactory.displayName}
          data-testid={TEST_SUBJ_ACTION_FACTORY_ITEM}
          data-test-subj={TEST_SUBJ_ACTION_FACTORY_ITEM}
          onClick={() => onActionFactorySelected(actionFactory)}
        >
          {actionFactory.iconType && <EuiIcon type={actionFactory.iconType} size="m" />}
        </EuiKeyPadMenuItem>
      ))}
    </EuiFlexGroup>
  );
};
