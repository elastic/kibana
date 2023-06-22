/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { UseArray } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleObjectId } from '../../../../../common/detection_engine/rule_schema';
import { isQueryRule } from '../../../../../common/detection_engine/utils';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ResponseActionsForm } from '../../../../detection_engine/rule_response_actions/response_actions_form';
import type { RuleStepProps, ActionsStepRule } from '../../../pages/detection_engine/rules/types';
import { RuleStep } from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField, useForm } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { RuleActionsField } from '../rule_actions_field';
import { useKibana } from '../../../../common/lib/kibana';
import { getSchema } from './get_schema';
import * as I18n from './translations';
import { APP_UI_ID } from '../../../../../common/constants';
import { RuleSnoozeSection } from './rule_snooze_section';

interface StepRuleActionsProps extends RuleStepProps {
  ruleId?: RuleObjectId; // Rule SO's id (not ruleId)
  defaultValues?: ActionsStepRule | null;
  actionMessageParams: ActionVariables;
  summaryActionMessageParams: ActionVariables;
  ruleType?: Type;
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
  addPadding = false,
  defaultValues,
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  onSubmit,
  setForm,
  actionMessageParams,
  summaryActionMessageParams,
  ruleType,
}) => {
  const {
    services: {
      application,
      triggersActionsUi: { actionTypeRegistry },
    },
  } = useKibana();
  const responseActionsEnabled = useIsExperimentalFeatureEnabled('responseActionsEnabled');
  const kibanaAbsoluteUrl = useMemo(
    () =>
      application.getUrlForApp(`${APP_UI_ID}`, {
        absolute: true,
      }),
    [application]
  );

  const initialState = {
    ...(defaultValues ?? stepActionsDefaultValue),
    kibanaSiemAppUrl: kibanaAbsoluteUrl,
  };

  const schema = useMemo(() => getSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  const { form } = useForm<ActionsStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, getFormData, submit } = form;

  const handleSubmit = useCallback(
    (enabled: boolean) => {
      getFields().enabled.setValue(enabled);
      if (onSubmit) {
        onSubmit();
      }
    },
    [getFields, onSubmit]
  );

  const getData = useCallback(async () => {
    const result = await submit();
    return result?.isValid
      ? result
      : {
          isValid: false,
          data: getFormData(),
        };
  }, [getFormData, submit]);

  useEffect(() => {
    let didCancel = false;
    if (setForm && !didCancel) {
      setForm(RuleStep.ruleActions, getData);
    }
    return () => {
      didCancel = true;
    };
  }, [getData, setForm]);

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

  if (isReadOnlyView) {
    return (
      <StepContentWrapper addPadding={addPadding}>
        <StepRuleDescription schema={schema} data={initialState} columns="single" />
      </StepContentWrapper>
    );
  }

  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepRuleActions">
          <EuiForm>{displayActionsDropDown}</EuiForm>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={false}
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={() => handleSubmit(false)}
                data-test-subj="create-enabled-false"
              >
                {I18n.COMPLETE_WITHOUT_ENABLING}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={() => handleSubmit(true)}
                data-test-subj="create-enable"
              >
                {I18n.COMPLETE_WITH_ENABLING}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const StepRuleActions = memo(StepRuleActionsComponent);
