/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { UpdateRulesSchema } from '../../../../../../common/detection_engine/schemas/request';
import { useRule, useUpdateRule } from '../../../../containers/detection_engine/rules';
import { useListsConfig } from '../../../../containers/detection_engine/lists/use_lists_config';
import { SecuritySolutionPageWrapper } from '../../../../../common/components/page_wrapper';
import {
  getRuleDetailsUrl,
  getDetectionEngineUrl,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { displaySuccessToast, useStateToaster } from '../../../../../common/components/toasters';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../components/user_info';
import { StepPanel } from '../../../../components/rules/step_panel';
import { StepAboutRule } from '../../../../components/rules/step_about_rule';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import { StepRuleActions } from '../../../../components/rules/step_rule_actions';
import {
  formatRule,
  stepIsValid,
  isDefineStep,
  isAboutStep,
  isScheduleStep,
  isActionsStep,
} from '../create/helpers';
import {
  getStepsData,
  redirectToDetections,
  getActionMessageParams,
  userHasPermissions,
  MaxWidthEuiFlexItem,
} from '../helpers';
import * as ruleI18n from '../translations';
import { RuleStep, RuleStepsFormHooks, RuleStepsFormData, RuleStepsData } from '../types';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';
import { ruleStepsOrder } from '../utils';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../common/constants';
import { HeaderPage } from '../../../../../common/components/header_page';

const formHookNoop = async (): Promise<undefined> => undefined;

const EditRulePageComponent: FC = () => {
  const [, dispatchToaster] = useStateToaster();
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const {
    application: { navigateToApp },
    executionContext,
  } = useKibana().services;

  const { detailName: ruleId } = useParams<{ detailName: string | undefined }>();
  const [ruleLoading, rule] = useRule(ruleId);
  const loading = ruleLoading || userInfoLoading || listsConfigLoading;

  // Application ID and current URL are traced automatically.
  useExecutionContext(executionContext, {
    page: `${SecurityPageName.rules}_edit`,
    type: 'application',
  });

  const formHooks = useRef<RuleStepsFormHooks>({
    [RuleStep.defineRule]: formHookNoop,
    [RuleStep.aboutRule]: formHookNoop,
    [RuleStep.scheduleRule]: formHookNoop,
    [RuleStep.ruleActions]: formHookNoop,
  });
  const stepsData = useRef<RuleStepsFormData>({
    [RuleStep.defineRule]: { isValid: false, data: undefined },
    [RuleStep.aboutRule]: { isValid: false, data: undefined },
    [RuleStep.scheduleRule]: { isValid: false, data: undefined },
    [RuleStep.ruleActions]: { isValid: false, data: undefined },
  });
  const defineStep = stepsData.current[RuleStep.defineRule];
  const aboutStep = stepsData.current[RuleStep.aboutRule];
  const scheduleStep = stepsData.current[RuleStep.scheduleRule];
  const actionsStep = stepsData.current[RuleStep.ruleActions];
  const [activeStep, setActiveStep] = useState<RuleStep>(RuleStep.defineRule);
  const invalidSteps = ruleStepsOrder.filter((step) => {
    const stepData = stepsData.current[step];
    return stepData.data != null && !stepIsValid(stepData);
  });
  const [{ isLoading, isSaved }, setRule] = useUpdateRule();
  const actionMessageParams = useMemo(() => getActionMessageParams(rule?.type), [rule?.type]);
  const setFormHook = useCallback(
    <K extends keyof RuleStepsFormHooks>(step: K, hook: RuleStepsFormHooks[K]) => {
      formHooks.current[step] = hook;
      if (step === activeStep) {
        hook();
      }
    },
    [activeStep]
  );
  const setStepData = useCallback(
    <K extends keyof RuleStepsData>(step: K, data: RuleStepsData[K], isValid: boolean) => {
      stepsData.current[step] = { ...stepsData.current[step], data, isValid };
    },
    []
  );

  const tabs = useMemo(
    () => [
      {
        'data-test-subj': 'edit-rule-define-tab',
        id: RuleStep.defineRule,
        name: ruleI18n.DEFINITION,
        disabled: rule?.immutable,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.DEFINITION}>
              {defineStep.data != null && (
                <StepDefineRule
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={defineStep.data}
                  setForm={setFormHook}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
      {
        'data-test-subj': 'edit-rule-about-tab',
        id: RuleStep.aboutRule,
        name: ruleI18n.ABOUT,
        disabled: rule?.immutable,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.ABOUT}>
              {aboutStep.data != null && defineStep.data != null && (
                <StepAboutRule
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={aboutStep.data}
                  defineRuleData={defineStep.data}
                  setForm={setFormHook}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
      {
        'data-test-subj': 'edit-rule-schedule-tab',
        id: RuleStep.scheduleRule,
        name: ruleI18n.SCHEDULE,
        disabled: rule?.immutable,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.SCHEDULE}>
              {scheduleStep.data != null && (
                <StepScheduleRule
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={scheduleStep.data}
                  setForm={setFormHook}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
      {
        'data-test-subj': 'edit-rule-actions-tab',
        id: RuleStep.ruleActions,
        name: ruleI18n.ACTIONS,
        content: (
          <>
            <EuiSpacer />
            <StepPanel loading={loading} title={ruleI18n.ACTIONS}>
              {actionsStep.data != null && (
                <StepRuleActions
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={actionsStep.data}
                  setForm={setFormHook}
                  actionMessageParams={actionMessageParams}
                />
              )}
              <EuiSpacer />
            </StepPanel>
          </>
        ),
      },
    ],
    [
      rule?.immutable,
      loading,
      defineStep.data,
      isLoading,
      setFormHook,
      aboutStep.data,
      scheduleStep.data,
      actionsStep.data,
      actionMessageParams,
    ]
  );

  const onSubmit = useCallback(async () => {
    const activeStepData = await formHooks.current[activeStep]();
    if (activeStepData?.data != null) {
      setStepData(activeStep, activeStepData.data, activeStepData.isValid);
    }
    const define = isDefineStep(activeStepData) ? activeStepData : defineStep;
    const about = isAboutStep(activeStepData) ? activeStepData : aboutStep;
    const schedule = isScheduleStep(activeStepData) ? activeStepData : scheduleStep;
    const actions = isActionsStep(activeStepData) ? activeStepData : actionsStep;

    if (
      stepIsValid(define) &&
      stepIsValid(about) &&
      stepIsValid(schedule) &&
      stepIsValid(actions)
    ) {
      setRule({
        ...formatRule<UpdateRulesSchema>(
          define.data,
          about.data,
          schedule.data,
          actions.data,
          rule
        ),
        ...(ruleId ? { id: ruleId } : {}),
        ...(rule != null ? { max_signals: rule.max_signals } : {}),
      });
    }
  }, [
    aboutStep,
    actionsStep,
    activeStep,
    defineStep,
    rule,
    ruleId,
    scheduleStep,
    setRule,
    setStepData,
  ]);

  useEffect(() => {
    if (rule != null) {
      const { aboutRuleData, defineRuleData, scheduleRuleData, ruleActionsData } = getStepsData({
        rule,
      });
      setStepData(RuleStep.defineRule, defineRuleData, true);
      setStepData(RuleStep.aboutRule, aboutRuleData, true);
      setStepData(RuleStep.scheduleRule, scheduleRuleData, true);
      setStepData(RuleStep.ruleActions, ruleActionsData, true);
    }
  }, [rule, setStepData]);

  const goToStep = useCallback(async (step: RuleStep) => {
    setActiveStep(step);
    await formHooks.current[step]();
  }, []);

  const onTabClick = useCallback(
    async (tab: EuiTabbedContentTab) => {
      const targetStep = tab.id as RuleStep;
      const activeStepData = await formHooks.current[activeStep]();

      if (activeStepData?.data != null) {
        setStepData(activeStep, activeStepData.data, activeStepData.isValid);
        goToStep(targetStep);
      }
    },
    [activeStep, goToStep, setStepData]
  );

  const goToDetailsRule = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(ruleId ?? ''),
      });
    },
    [navigateToApp, ruleId]
  );

  useEffect(() => {
    if (rule?.immutable) {
      setActiveStep(RuleStep.ruleActions);
    } else {
      setActiveStep(RuleStep.defineRule);
    }
  }, [rule]);

  if (isSaved) {
    displaySuccessToast(i18n.SUCCESSFULLY_SAVED_RULE(rule?.name ?? ''), dispatchToaster);
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleId ?? ''),
    });
    return null;
  }

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  } else if (!userHasPermissions(canUserCRUD)) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleId ?? ''),
    });
    return null;
  }

  return (
    <>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup direction="row" justifyContent="spaceAround">
          <MaxWidthEuiFlexItem>
            <HeaderPage
              backOptions={{
                path: getRuleDetailsUrl(ruleId ?? ''),
                text: `${i18n.BACK_TO} ${rule?.name ?? ''}`,
                pageId: SecurityPageName.rules,
                dataTestSubj: 'ruleEditBackToRuleDetails',
              }}
              isLoading={isLoading}
              title={i18n.PAGE_TITLE}
            />
            {invalidSteps.length > 0 && (
              <EuiCallOut title={i18n.SORRY_ERRORS} color="danger" iconType="alert">
                <FormattedMessage
                  id="xpack.securitySolution.detectionEngine.rule.editRule.errorMsgDescription"
                  defaultMessage="You have an invalid input in {countError, plural, one {this tab} other {these tabs}}: {tabHasError}"
                  values={{
                    countError: invalidSteps.length,
                    tabHasError: invalidSteps
                      .map((t) => {
                        if (t === RuleStep.aboutRule) {
                          return ruleI18n.ABOUT;
                        } else if (t === RuleStep.defineRule) {
                          return ruleI18n.DEFINITION;
                        } else if (t === RuleStep.scheduleRule) {
                          return ruleI18n.SCHEDULE;
                        } else if (t === RuleStep.ruleActions) {
                          return ruleI18n.RULE_ACTIONS;
                        }
                        return t;
                      })
                      .join(', '),
                  }}
                />
              </EuiCallOut>
            )}

            <EuiTabbedContent
              initialSelectedTab={tabs[0]}
              selectedTab={tabs.find((t) => t.id === activeStep)}
              onTabClick={onTabClick}
              tabs={tabs}
            />

            <EuiSpacer />

            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButton iconType="cross" onClick={goToDetailsRule}>
                  {i18n.CANCEL}
                </EuiButton>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="ruleEditSubmitButton"
                  fill
                  onClick={onSubmit}
                  iconType="save"
                  isLoading={isLoading}
                  isDisabled={loading}
                >
                  {i18n.SAVE_CHANGES}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </MaxWidthEuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rules} state={{ ruleName: rule?.name }} />
    </>
  );
};

export const EditRulePage = memo(EditRulePageComponent);
