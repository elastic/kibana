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
  EuiKeyPadMenuItemButton,
} from '@elastic/eui';
import { txtChangeButton } from './i18n';
import './action_wizard.scss';
import { ActionFactory } from '../../services';

type ActionBaseConfig = object;
type ActionFactoryBaseContext = object;

export interface ActionWizardProps {
  /**
   * List of available action factories
   */
  actionFactories: ActionFactory[];

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

  /**
   * Context will be passed into ActionFactory's methods
   */
  context: ActionFactoryBaseContext;
}

export const ActionWizard: React.FC<ActionWizardProps> = ({
  currentActionFactory,
  actionFactories,
  onActionFactoryChange,
  onConfigChange,
  config,
  context,
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
        context={context}
        config={config}
        onConfigChange={newConfig => {
          onConfigChange(newConfig);
        }}
      />
    );
  }

  return (
    <ActionFactorySelector
      context={context}
      actionFactories={actionFactories}
      onActionFactorySelected={actionFactory => {
        onActionFactoryChange(actionFactory);
      }}
    />
  );
};

interface SelectedActionFactoryProps {
  actionFactory: ActionFactory;
  config: ActionBaseConfig;
  context: ActionFactoryBaseContext;
  onConfigChange: (config: ActionBaseConfig) => void;
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
  context,
}) => {
  return (
    <div
      className="auaActionWizard__selectedActionFactoryContainer"
      data-test-subj={TEST_SUBJ_SELECTED_ACTION_FACTORY}
    >
      <header>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          {actionFactory.getIconType(context) && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionFactory.getIconType(context)!} size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>{actionFactory.getDisplayName(context)}</h4>
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
        {actionFactory.ReactCollectConfig({
          config,
          onConfig: onConfigChange,
        })}
      </div>
    </div>
  );
};

interface ActionFactorySelectorProps {
  actionFactories: ActionFactory[];
  context: ActionFactoryBaseContext;
  onActionFactorySelected: (actionFactory: ActionFactory) => void;
}

export const TEST_SUBJ_ACTION_FACTORY_ITEM = 'action-factory-item';

const ActionFactorySelector: React.FC<ActionFactorySelectorProps> = ({
  actionFactories,
  onActionFactorySelected,
  context,
}) => {
  if (actionFactories.length === 0) {
    // this is not user facing, as it would be impossible to get into this state
    // just leaving for dev purposes for troubleshooting
    return <div>No action factories to pick from</div>;
  }

  return (
    <EuiFlexGroup wrap>
      {[...actionFactories]
        .sort((f1, f2) => f1.order - f2.order)
        .map(actionFactory => (
          <EuiKeyPadMenuItemButton
            className="auaActionWizard__actionFactoryItem"
            key={actionFactory.id}
            label={actionFactory.getDisplayName(context)}
            data-test-subj={TEST_SUBJ_ACTION_FACTORY_ITEM}
            onClick={() => onActionFactorySelected(actionFactory)}
          >
            {actionFactory.getIconType(context) && (
              <EuiIcon type={actionFactory.getIconType(context)!} size="m" />
            )}
          </EuiKeyPadMenuItemButton>
        ))}
    </EuiFlexGroup>
  );
};
