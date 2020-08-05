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
  EuiKeyPadMenuItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { txtChangeButton } from './i18n';
import './action_wizard.scss';
import { ActionFactory } from '../../dynamic_actions';

export interface ActionWizardProps {
  /**
   * List of available action factories
   */
  actionFactories: ActionFactory[];

  /**
   * Currently selected action factory
   * undefined - is allowed and means that none is selected
   */
  currentActionFactory?: ActionFactory;

  /**
   * Action factory selected changed
   * empty - means user click "change" and removed action factory selection
   */
  onActionFactoryChange: (actionFactory?: ActionFactory) => void;

  /**
   * current config for currently selected action factory
   */
  config?: object;

  /**
   * config changed
   */
  onConfigChange: (config: object) => void;

  /**
   * Context will be passed into ActionFactory's methods
   */
  context: object;
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
  if (
    !currentActionFactory &&
    actionFactories.length === 1 &&
    actionFactories[0].isCompatibleLicence()
  ) {
    onActionFactoryChange(actionFactories[0]);
  }

  if (currentActionFactory && config) {
    return (
      <SelectedActionFactory
        actionFactory={currentActionFactory}
        showDeselect={actionFactories.length > 1}
        onDeselect={() => {
          onActionFactoryChange(undefined);
        }}
        context={context}
        config={config}
        onConfigChange={(newConfig) => {
          onConfigChange(newConfig);
        }}
      />
    );
  }

  return (
    <ActionFactorySelector
      context={context}
      actionFactories={actionFactories}
      onActionFactorySelected={(actionFactory) => {
        onActionFactoryChange(actionFactory);
      }}
    />
  );
};

interface SelectedActionFactoryProps {
  actionFactory: ActionFactory;
  config: object;
  context: object;
  onConfigChange: (config: object) => void;
  showDeselect: boolean;
  onDeselect: () => void;
}

export const TEST_SUBJ_SELECTED_ACTION_FACTORY = 'selectedActionFactory';

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
      data-test-subj={`${TEST_SUBJ_SELECTED_ACTION_FACTORY}-${actionFactory.id}`}
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
              <EuiButtonEmpty size="xs" onClick={() => onDeselect()}>
                {txtChangeButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </header>
      <EuiSpacer size="m" />
      <div>
        <actionFactory.ReactCollectConfig
          config={config}
          onConfig={onConfigChange}
          context={context}
        />
      </div>
    </div>
  );
};

interface ActionFactorySelectorProps {
  actionFactories: ActionFactory[];
  context: object;
  onActionFactorySelected: (actionFactory: ActionFactory) => void;
}

export const TEST_SUBJ_ACTION_FACTORY_ITEM = 'actionFactoryItem';

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

  // The below style is applied to fix Firefox rendering bug.
  // See: https://github.com/elastic/kibana/pull/61219/#pullrequestreview-402903330
  const firefoxBugFix = {
    willChange: 'opacity',
  };

  /**
   * make sure not compatible factories are in the end
   */
  const ensureOrder = (factories: ActionFactory[]) => {
    const compatibleLicense = factories.filter((f) => f.isCompatibleLicence());
    const notCompatibleLicense = factories.filter((f) => !f.isCompatibleLicence());
    return [
      ...compatibleLicense.sort((f1, f2) => f2.order - f1.order),
      ...notCompatibleLicense.sort((f1, f2) => f2.order - f1.order),
    ];
  };

  return (
    <EuiFlexGroup gutterSize="m" wrap={true} style={firefoxBugFix}>
      {ensureOrder(actionFactories).map((actionFactory) => (
        <EuiFlexItem grow={false} key={actionFactory.id}>
          <EuiToolTip
            content={
              !actionFactory.isCompatibleLicence() && (
                <FormattedMessage
                  defaultMessage="Insufficient license level"
                  id="xpack.uiActionsEnhanced.components.actionWizard.insufficientLicenseLevelTooltip"
                />
              )
            }
          >
            <EuiKeyPadMenuItem
              className="auaActionWizard__actionFactoryItem"
              label={actionFactory.getDisplayName(context)}
              data-test-subj={`${TEST_SUBJ_ACTION_FACTORY_ITEM}-${actionFactory.id}`}
              onClick={() => onActionFactorySelected(actionFactory)}
              disabled={!actionFactory.isCompatibleLicence()}
            >
              {actionFactory.getIconType(context) && (
                <EuiIcon type={actionFactory.getIconType(context)!} size="m" />
              )}
            </EuiKeyPadMenuItem>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
