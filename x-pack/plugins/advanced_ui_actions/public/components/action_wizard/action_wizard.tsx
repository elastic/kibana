/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
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
export type ActionFactoryBaseConfig = {};
export interface ActionFactory<Config extends ActionFactoryBaseConfig, Context = null> {
  type: string;
  displayName: string;
  iconType?: string;
  wizard: React.FC<ActionFactoryWizardProps<Config, Context>>;
  context: Context;
}

export interface ActionFactoryWizardProps<Config extends ActionFactoryBaseConfig, Context = void> {
  /**
   * Context represents environment where this component is being rendered.
   */
  context: Context;

  /**
   * Current (latest) config of the item. (state)
   */
  config: Config | null;

  /**
   * Callback called when user updates the config in UI.
   * ActionFactory's wizard should do validations to the user's input
   * In case input is complete and valid - config: Config object should be emitted
   * In case input has changed to the invalid state: null should be emitted
   */
  onConfig: (config: Config | null) => void;
}

export interface ActionWizardProps {
  /**
   * List of available action factories
   */
  actionFactories: Array<ActionFactory<ActionFactoryBaseConfig, unknown>>;

  /**
   * Notifies when wizard's state changes because of user's interaction
   *
   * @param actionFactory - current selected action factory. null if none is selected
   * @param config - current config for current action factory. null if no action factory or if wizard's inputs are invalid or incomplete
   */
  onChange: (
    actionFactory: ActionFactory<ActionFactoryBaseConfig, unknown> | null,
    config: ActionFactoryBaseConfig | null
  ) => void;
}
export const ActionWizard: React.FC<ActionWizardProps> = ({ actionFactories, onChange }) => {
  // eslint-disable-next-line prefer-const
  let [selectedActionFactory, setSelectedActionFactory] = useState<ActionFactory<
    ActionFactoryBaseConfig,
    unknown
  > | null>(null);

  // auto pick action factory if there is only 1 available
  if (!selectedActionFactory && actionFactories.length === 1) {
    selectedActionFactory = actionFactories[0];
  }

  if (selectedActionFactory) {
    return (
      <SelectedActionFactory
        actionFactory={selectedActionFactory}
        showDeselect={actionFactories.length > 1}
        onDeselect={() => {
          setSelectedActionFactory(null);
          onChange(null, null);
        }}
        onConfigChange={newConfig => {
          onChange(selectedActionFactory, newConfig);
        }}
      />
    );
  }

  return (
    <ActionFactorySelector
      actionFactories={actionFactories}
      onActionFactorySelected={actionFactory => {
        setSelectedActionFactory(actionFactory);
        onChange(actionFactory, null);
      }}
    />
  );
};

interface SelectedActionFactoryProps<Config extends ActionFactoryBaseConfig, Context = unknown> {
  actionFactory: ActionFactory<Config, Context>;
  onConfigChange: (config: Config | null) => void;
  showDeselect: boolean;
  onDeselect: () => void;
}
export const TEST_SUBJ_SELECTED_ACTION_FACTORY = 'selected-action-factory';
const SelectedActionFactory: React.FC<SelectedActionFactoryProps<ActionFactoryBaseConfig>> = ({
  actionFactory,
  onDeselect,
  showDeselect,
  onConfigChange,
}) => {
  const [config, setConfig] = useState<ActionFactoryBaseConfig | null>(null);
  return (
    <div
      className="auaActionWizard__selectedActionFactoryContainer"
      data-test-subj={TEST_SUBJ_SELECTED_ACTION_FACTORY}
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
          context: actionFactory.context,
          config,
          onConfig: newConfig => {
            setConfig(newConfig);
            onConfigChange(newConfig);
          },
        })}
      </div>
    </div>
  );
};

interface ActionFactorySelectorProps {
  actionFactories: Array<ActionFactory<ActionFactoryBaseConfig, unknown>>;
  onActionFactorySelected: (actionFactory: ActionFactory<ActionFactoryBaseConfig, unknown>) => void;
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
          data-test-subj={TEST_SUBJ_ACTION_FACTORY_ITEM}
          onClick={() => onActionFactorySelected(actionFactory)}
        >
          {actionFactory.iconType && <EuiIcon type={actionFactory.iconType} size="m" />}
        </EuiKeyPadMenuItem>
      ))}
    </EuiFlexGroup>
  );
};
