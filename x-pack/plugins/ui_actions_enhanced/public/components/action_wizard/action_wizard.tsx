/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  EuiFormFieldset,
  EuiCheckableCard,
  EuiTextColor,
  EuiTitle,
  EuiLink,
  EuiBetaBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  txtBetaActionFactoryLabel,
  txtBetaActionFactoryTooltip,
  txtChangeButton,
  txtTriggerPickerHelpText,
  txtTriggerPickerLabel,
  txtTriggerPickerHelpTooltip,
} from './i18n';
import './action_wizard.scss';
import { ActionFactory, BaseActionConfig, BaseActionFactoryContext } from '../../dynamic_actions';
import { Trigger } from '@kbn/ui-actions-plugin/public';

export interface ActionWizardProps<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
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
  config?: BaseActionConfig;

  /**
   * config changed
   */
  onConfigChange: (config: BaseActionConfig) => void;

  /**
   * Context will be passed into ActionFactory's methods
   */
  context: ActionFactoryContext;

  /**
   * Trigger selection has changed
   * @param triggers
   */
  onSelectedTriggersChange: (triggers?: string[]) => void;

  getTriggerInfo: (triggerId: string) => Trigger;

  /**
   * List of possible triggers in current context
   */
  triggers: string[];

  triggerPickerDocsLink?: string;
}

export const ActionWizard: React.FC<ActionWizardProps> = ({
  currentActionFactory,
  actionFactories,
  onActionFactoryChange,
  onConfigChange,
  config,
  context,
  onSelectedTriggersChange,
  getTriggerInfo,
  triggers,
  triggerPickerDocsLink,
}) => {
  // auto pick action factory if there is only 1 available
  React.useEffect(() => {
    if (
      !currentActionFactory &&
      actionFactories.length === 1 &&
      actionFactories[0].isCompatibleLicense()
    ) {
      onActionFactoryChange(actionFactories[0]);
    }
  }, [currentActionFactory, actionFactories, actionFactories.length, onActionFactoryChange]);

  // auto pick selected trigger if none is picked
  React.useEffect(() => {
    if (currentActionFactory && !((context.triggers?.length ?? 0) > 0)) {
      const actionTriggers = getTriggersForActionFactory(currentActionFactory, triggers);
      if (actionTriggers.length > 0) {
        onSelectedTriggersChange([actionTriggers[0]]);
      }
    }
  }, [currentActionFactory, triggers, context.triggers?.length, onSelectedTriggersChange]);

  if (currentActionFactory) {
    if (!config) return null;

    const allTriggers = getTriggersForActionFactory(currentActionFactory, triggers);
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
        allTriggers={allTriggers}
        getTriggerInfo={getTriggerInfo}
        onSelectedTriggersChange={onSelectedTriggersChange}
        triggerPickerDocsLink={triggerPickerDocsLink}
      />
    );
  }

  return (
    <ActionFactorySelector
      context={context}
      actionFactories={actionFactories}
      onActionFactorySelected={onActionFactoryChange}
    />
  );
};

interface TriggerPickerProps {
  triggers: string[];
  selectedTriggers?: string[];
  getTriggerInfo: (triggerId: string) => Trigger;
  onSelectedTriggersChange: (triggers?: string[]) => void;
  triggerPickerDocsLink?: string;
}

const TriggerPicker: React.FC<TriggerPickerProps> = ({
  triggers,
  selectedTriggers,
  getTriggerInfo,
  onSelectedTriggersChange,
  triggerPickerDocsLink,
}) => {
  const selectedTrigger = selectedTriggers ? selectedTriggers[0] : undefined;
  return (
    <EuiFormFieldset
      data-test-subj={`triggerPicker`}
      legend={{
        children: (
          <EuiText size="s">
            <h5>
              <span>{txtTriggerPickerLabel}</span>{' '}
              <EuiToolTip content={txtTriggerPickerHelpTooltip}>
                <EuiLink href={triggerPickerDocsLink} target={'blank'} external>
                  {txtTriggerPickerHelpText}
                </EuiLink>
              </EuiToolTip>
            </h5>
          </EuiText>
        ),
      }}
      style={{ maxWidth: `80%` }}
    >
      {triggers.map((trigger) => (
        <React.Fragment key={trigger}>
          <EuiCheckableCard
            id={trigger}
            label={
              <>
                <EuiTitle size={'xxs'}>
                  <span>{getTriggerInfo(trigger)?.title ?? 'Unknown'}</span>
                </EuiTitle>
                {getTriggerInfo(trigger)?.description && (
                  <div>
                    <EuiText size={'s'}>
                      <EuiTextColor color={'subdued'}>
                        {getTriggerInfo(trigger)?.description}
                      </EuiTextColor>
                    </EuiText>
                  </div>
                )}
              </>
            }
            name={trigger}
            value={trigger}
            checked={selectedTrigger === trigger}
            onChange={() => onSelectedTriggersChange([trigger])}
            data-test-subj={`triggerPicker-${trigger}`}
          />
          <EuiSpacer size={'s'} />
        </React.Fragment>
      ))}
    </EuiFormFieldset>
  );
};

interface SelectedActionFactoryProps<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
  actionFactory: ActionFactory;
  config: BaseActionConfig;
  context: ActionFactoryContext;
  onConfigChange: (config: BaseActionConfig) => void;
  showDeselect: boolean;
  onDeselect: () => void;
  allTriggers: string[];
  getTriggerInfo: (triggerId: string) => Trigger;
  onSelectedTriggersChange: (triggers?: string[]) => void;
  triggerPickerDocsLink?: string;
}

export const TEST_SUBJ_SELECTED_ACTION_FACTORY = 'selectedActionFactory';

const SelectedActionFactory: React.FC<SelectedActionFactoryProps> = ({
  actionFactory,
  onDeselect,
  showDeselect,
  onConfigChange,
  config,
  context,
  allTriggers,
  getTriggerInfo,
  onSelectedTriggersChange,
  triggerPickerDocsLink,
}) => {
  return (
    <div
      className="auaActionWizard__selectedActionFactoryContainer"
      data-test-subj={`${TEST_SUBJ_SELECTED_ACTION_FACTORY}-${actionFactory.id}`}
    >
      <header>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          {actionFactory.getIconType(context) && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionFactory.getIconType(context)!} size="m" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>
                {actionFactory.getDisplayName(context)}{' '}
                {actionFactory.isBeta && (
                  <EuiBetaBadge
                    label={txtBetaActionFactoryLabel}
                    tooltipContent={txtBetaActionFactoryTooltip}
                  />
                )}
              </h4>
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
      {allTriggers.length > 1 && (
        <>
          <EuiSpacer size="l" />
          <TriggerPicker
            triggers={allTriggers}
            getTriggerInfo={getTriggerInfo}
            selectedTriggers={context.triggers}
            onSelectedTriggersChange={onSelectedTriggersChange}
            triggerPickerDocsLink={triggerPickerDocsLink}
          />
        </>
      )}
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

interface ActionFactorySelectorProps<
  ActionFactoryContext extends BaseActionFactoryContext = BaseActionFactoryContext
> {
  actionFactories: ActionFactory[];
  context: ActionFactoryContext;
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
    const compatibleLicense = factories.filter((f) => f.isCompatibleLicense());
    const notCompatibleLicense = factories.filter((f) => !f.isCompatibleLicense());
    return [
      ...compatibleLicense.sort((f1, f2) => f2.order - f1.order),
      ...notCompatibleLicense.sort((f1, f2) => f2.order - f1.order),
    ];
  };

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap={true} style={firefoxBugFix}>
      {ensureOrder(actionFactories).map((actionFactory) => (
        <EuiFlexItem grow={false} key={actionFactory.id}>
          <EuiToolTip
            content={
              !actionFactory.isCompatibleLicense() && (
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
              disabled={!actionFactory.isCompatibleLicense()}
              betaBadgeLabel={actionFactory.isBeta ? txtBetaActionFactoryLabel : undefined}
              betaBadgeTooltipContent={
                actionFactory.isBeta ? txtBetaActionFactoryTooltip : undefined
              }
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

function getTriggersForActionFactory(
  actionFactory: ActionFactory,
  allTriggers: string[]
): string[] {
  return actionFactory.supportedTriggers().filter((trigger) => allTriggers.includes(trigger));
}
