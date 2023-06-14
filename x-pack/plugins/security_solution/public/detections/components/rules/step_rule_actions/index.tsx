/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { UseArray } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleObjectId } from '../../../../../common/detection_engine/rule_schema';
import { isQueryRule } from '../../../../../common/detection_engine/utils';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ResponseActionsForm } from '../../../../detection_engine/rule_response_actions/response_actions_form';
import type { RuleStepProps, ActionsStepRule } from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField } from '../../../../shared_imports';
import type { FormHook } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { RuleActionsField } from '../rule_actions_field';
import { useKibana } from '../../../../common/lib/kibana';
import { getSchema } from './get_schema';
import * as I18n from './translations';
import { RuleSnoozeSection } from './rule_snooze_section';

interface StepRuleActionsProps extends RuleStepProps {
  ruleId?: RuleObjectId; // Rule SO's id (not ruleId)
  actionMessageParams: ActionVariables;
  summaryActionMessageParams: ActionVariables;
  ruleType?: Type;
  form: FormHook<ActionsStepRule>;
}

interface StepRuleActionsReadOnlyProps {
  addPadding: boolean;
  defaultValues: ActionsStepRule;
}

export const stepActionsDefaultValue: ActionsStepRule = {
  enabled: true,
  actions: [],
  responseActions: [],
  kibanaSiemAppUrl: '',
};

const GhostFormField = () => <></>;

const DisplayActionsHeader = () => {
  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            defaultMessage="Actions"
            id="xpack.securitySolution.detectionEngine.rule.editRule.actionSectionsTitle"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="l" />
    </>
  );
};

const StepRuleActionsComponent: FC<StepRuleActionsProps> = ({
  ruleId,
  isUpdateView = false,
  actionMessageParams,
  summaryActionMessageParams,
  ruleType,
  form,
}) => {
  const {
    services: { application },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');

  const displayActionsOptions = useMemo(
    () => (
      <>
        <EuiSpacer />
        <UseField
          path="actions"
          component={RuleActionsField}
          componentProps={{
            messageVariables: actionMessageParams,
            summaryMessageVariables: summaryActionMessageParams,
          }}
        />
      </>
    ),
    [actionMessageParams, summaryActionMessageParams]
  );
  const displayResponseActionsOptions = useMemo(() => {
    if (isQueryRule(ruleType)) {
      return (
        <UseArray path="responseActions" initialNumberOfItems={0}>
          {ResponseActionsForm}
        </UseArray>
      );
    }
    return null;
  }, [ruleType]);
  // only display the actions dropdown if the user has "read" privileges for actions
  const displayActionsDropDown = useMemo(() => {
    return application.capabilities.actions.show ? (
      <>
        <DisplayActionsHeader />
        {ruleId && <RuleSnoozeSection ruleId={ruleId} />}
        {displayActionsOptions}
        {responseActionsEnabled && displayResponseActionsOptions}
        <UseField path="kibanaSiemAppUrl" component={GhostFormField} />
        <UseField path="enabled" component={GhostFormField} />
      </>
    ) : (
      <>
        <EuiText>{I18n.NO_ACTIONS_READ_PERMISSIONS}</EuiText>
      </>
    );
  }, [
    ruleId,
    application.capabilities.actions.show,
    displayActionsOptions,
    displayResponseActionsOptions,
    responseActionsEnabled,
  ]);

  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepRuleActions">
          <EuiForm>{displayActionsDropDown}</EuiForm>
        </Form>
      </StepContentWrapper>
    </>
  );
};
export const StepRuleActions = memo(StepRuleActionsComponent);

const StepRuleActionsReadOnlyComponent: FC<StepRuleActionsReadOnlyProps> = ({
  addPadding,
  defaultValues: data,
}) => {
  const {
    services: {
      triggersActionsUi: { actionTypeRegistry },
    },
  } = useKibana();
  const schema = useMemo(() => getSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  return (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription schema={schema} data={data} columns="single" />
    </StepContentWrapper>
  );
};
export const StepRuleActionsReadOnly = memo(StepRuleActionsReadOnlyComponent);
