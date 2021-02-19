/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiBetaBadge,
} from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import {
  txtNameOfDrilldown,
  txtUntitledDrilldown,
  txtBetaActionFactoryLabel,
  txtBetaActionFactoryTooltip,
} from './i18n';
import type { ActionFactory, BaseActionFactoryContext } from '../../../../dynamic_actions';
import { ActionWizard } from '../../../../components/action_wizard';
import { Trigger } from '../../../../../../../../src/plugins/ui_actions/public';
import { txtGetMoreActions } from './i18n';

const GET_MORE_ACTIONS_LINK = 'https://www.elastic.co/subscriptions';

const noopFn = () => {};

export interface FormDrilldownWizardProps {
  actionFactory: ActionFactory;
  context: BaseActionFactoryContext;
  isBeta?: boolean;

  /** Value of name field. */
  name?: string;

  /** Callback called on name change. */
  onNameChange?: (name: string) => void;

  /** List of possible triggers in current context. */
  triggers: string[];
}

export const DrilldownForm: React.FC<FormDrilldownWizardProps> = ({
  actionFactory,
  context,
  isBeta,
  name = '',
  onNameChange = noopFn,
  triggers = [],
}) => {
  if (!triggers || !triggers.length) {
    // Below callout is not translated, because this message is only for developers.
    return (
      <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
        <p>
          No triggers provided in <EuiCode>trigger</EuiCode> prop.
        </p>
      </EuiCallOut>
    );
  }

  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown}>
      <EuiFieldText
        name="drilldown_name"
        placeholder={txtUntitledDrilldown}
        value={name}
        disabled={onNameChange === noopFn}
        onChange={(event) => onNameChange(event.target.value)}
        data-test-subj="drilldownNameInput"
      />
    </EuiFormRow>
  );

  // const hasNotCompatibleLicenseFactory = () =>
  //   actionFactories?.some((f) => !f.isCompatibleLicense());

  // const renderGetMoreActionsLink = () => (
  //   <EuiText size="s">
  //     <EuiLink
  //       href={GET_MORE_ACTIONS_LINK}
  //       target="_blank"
  //       external
  //       data-test-subj={'getMoreActionsLink'}
  //     >
  //       {txtGetMoreActions}
  //     </EuiLink>
  //   </EuiText>
  // );

  const configFragment = (
    <div
      className="auaActionWizard__selectedActionFactoryContainer"
      data-test-subj={`selectedActionFactory-${actionFactory.id}`}
    >
      <header>
        <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
          {/* {actionFactory.getIconType(context) && (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionFactory.getIconType(context)!} size="m" />
            </EuiFlexItem>
          )} */}
          <EuiFlexItem grow={true}>
            <EuiText>
              <h4>
                {actionFactory.getDisplayName(context)}{' '}
                {isBeta && (
                  <EuiBetaBadge
                    label={txtBetaActionFactoryLabel}
                    tooltipContent={txtBetaActionFactoryTooltip}
                  />
                )}
              </h4>
            </EuiText>
          </EuiFlexItem>
          {/* {showDeselect && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={() => onDeselect()}>
                {txtChangeButton}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )} */}
        </EuiFlexGroup>
      </header>
      {/* {allTriggers.length > 1 && (
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
      )} */}
      <EuiSpacer size="m" />
      <div>
        {/* <actionFactory.ReactCollectConfig
          config={config}
          onConfig={onConfigChange}
          context={context}
        /> */}
      </div>
    </div>
  );

  return (
    <>
      <EuiForm>
        {nameFragment}
        <EuiSpacer size={'xl'} />
        {configFragment}
      </EuiForm>
    </>
  );
};
