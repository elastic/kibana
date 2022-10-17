/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTabbedContentTab } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { noop } from 'lodash';

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import type { RuleUpdateProps } from '../../../../../common/detection_engine/rule_schema';
import { useRule, useUpdateRule } from '../../../rule_management/logic';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import {
  getRuleDetailsUrl,
  getDetectionEngineUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { displaySuccessToast, useStateToaster } from '../../../../common/components/toasters';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { StepPanel } from '../../../../detections/components/rules/step_panel';
import { StepAboutRule } from '../../../../detections/components/rules/step_about_rule';
import { StepDefineRule } from '../../../../detections/components/rules/step_define_rule';
import { StepScheduleRule } from '../../../../detections/components/rules/step_schedule_rule';
import { StepRuleActions } from '../../../../detections/components/rules/step_rule_actions';
import {
  formatRule,
  stepIsValid,
  isDefineStep,
  isAboutStep,
  isScheduleStep,
  isActionsStep,
} from '../rule_creation/helpers';
import {
  getStepsData,
  redirectToDetections,
  getActionMessageParams,
  userHasPermissions,
  MaxWidthEuiFlexItem,
} from '../../../../detections/pages/detection_engine/rules/helpers';
import * as ruleI18n from '../../../../detections/pages/detection_engine/rules/translations';
import type {
  ActionsStepRule,
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  RuleStepsFormHooks,
  RuleStepsFormData,
  RuleStepsData,
} from '../../../../detections/pages/detection_engine/rules/types';
import { RuleStep } from '../../../../detections/pages/detection_engine/rules/types';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../app/types';
import { ruleStepsOrder } from '../../../../detections/pages/detection_engine/rules/utils';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import {
  APP_UI_ID,
  DEFAULT_INDEX_KEY,
  DEFAULT_THREAT_INDEX_KEY,
} from '../../../../../common/constants';
import { HeaderPage } from '../../../../common/components/header_page';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { PreviewFlyout } from '../../../../detections/pages/detection_engine/rules/preview';
import { useGetSavedQuery } from '../../../../detections/pages/detection_engine/rules/use_get_saved_query';

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
  const { data: dataServices } = useKibana().services;
  const { navigateToApp } = useKibana().services.application;

  const { detailName: ruleId } = useParams<{ detailName: string }>();
  const { data: rule, isLoading: ruleLoading } = useRule(ruleId);
  const loading = ruleLoading || userInfoLoading || listsConfigLoading;

  const { isSavedQueryLoading, savedQueryBar, savedQuery } = useGetSavedQuery(rule?.saved_id, {
    ruleType: rule?.type,
    onError: noop,
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
  const [defineStep, setDefineStep] = useState(stepsData.current[RuleStep.defineRule]);
  const [aboutStep, setAboutStep] = useState(stepsData.current[RuleStep.aboutRule]);
  const [scheduleStep, setScheduleStep] = useState(stepsData.current[RuleStep.scheduleRule]);
  const [actionsStep, setActionsStep] = useState(stepsData.current[RuleStep.ruleActions]);
  const [activeStep, setActiveStep] = useState<RuleStep>(RuleStep.defineRule);
  const invalidSteps = ruleStepsOrder.filter((step) => {
    const stepData = stepsData.current[step];
    return stepData.data != null && !stepIsValid(stepData);
  });
  const { mutateAsync: updateRule, isLoading } = useUpdateRule();
  const [dataViewOptions, setDataViewOptions] = useState<{ [x: string]: DataViewListItem }>({});
  const [isPreviewDisabled, setIsPreviewDisabled] = useState(false);
  const [isRulePreviewVisible, setIsRulePreviewVisible] = useState(false);

  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await dataServices.dataViews.getIdsWithTitle();
      const dataViewIdIndexPatternMap = dataViewsRefs.reduce(
        (acc, item) => ({
          ...acc,
          [item.id]: item,
        }),
        {}
      );
      setDataViewOptions(dataViewIdIndexPatternMap);
    };
    fetchDataViews();
  }, [dataServices.dataViews]);
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
      switch (step) {
        case RuleStep.aboutRule:
          const aboutData = data as AboutStepRule;
          setAboutStep({ ...stepsData.current[step], data: aboutData, isValid });
          return;
        case RuleStep.defineRule:
          const defineData = data as DefineStepRule;
          setDefineStep({ ...stepsData.current[step], data: defineData, isValid });
          return;
        case RuleStep.ruleActions:
          const actionsData = data as ActionsStepRule;
          setActionsStep({ ...stepsData.current[step], data: actionsData, isValid });
          return;
        case RuleStep.scheduleRule:
          const scheduleData = data as ScheduleStepRule;
          setScheduleStep({ ...stepsData.current[step], data: scheduleData, isValid });
      }
    },
    []
  );

  const onDataChange = useCallback(async () => {
    if (activeStep === RuleStep.defineRule) {
      const defineStepData = await formHooks.current[RuleStep.defineRule]();
      if (defineStepData?.isValid && defineStepData?.data) {
        setDefineStep(defineStepData);
      }
    } else if (activeStep === RuleStep.aboutRule) {
      const aboutStepData = await formHooks.current[RuleStep.aboutRule]();
      if (aboutStepData?.isValid && aboutStepData?.data) {
        setAboutStep(aboutStepData);
      }
    } else if (activeStep === RuleStep.scheduleRule) {
      const scheduleStepData = await formHooks.current[RuleStep.scheduleRule]();
      if (scheduleStepData?.isValid && scheduleStepData?.data) {
        setScheduleStep(scheduleStepData);
      }
    }
  }, [activeStep]);

  const onPreviewClose = useCallback(() => setIsRulePreviewVisible(false), []);

  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [threatIndicesConfig] = useUiSetting$<string[]>(DEFAULT_THREAT_INDEX_KEY);

  const defineStepDataWithSavedQuery = useMemo(
    () =>
      defineStep.data
        ? {
            ...defineStep.data,
            queryBar: savedQueryBar ?? defineStep.data.queryBar,
          }
        : defineStep.data,
    [defineStep.data, savedQueryBar]
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
            <StepPanel loading={loading || isSavedQueryLoading} title={ruleI18n.DEFINITION}>
              {defineStepDataWithSavedQuery != null && !isSavedQueryLoading && (
                <StepDefineRule
                  isReadOnlyView={false}
                  isLoading={isLoading || isSavedQueryLoading}
                  isUpdateView
                  defaultValues={defineStepDataWithSavedQuery}
                  setForm={setFormHook}
                  kibanaDataViews={dataViewOptions}
                  indicesConfig={indicesConfig}
                  threatIndicesConfig={threatIndicesConfig}
                  onRuleDataChange={onDataChange}
                  onPreviewDisabledStateChange={setIsPreviewDisabled}
                  defaultSavedQuery={savedQuery}
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
                  onRuleDataChange={onDataChange}
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
                  onRuleDataChange={onDataChange}
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
            <StepPanel loading={loading}>
              {actionsStep.data != null && (
                <StepRuleActions
                  isReadOnlyView={false}
                  isLoading={isLoading}
                  isUpdateView
                  defaultValues={actionsStep.data}
                  setForm={setFormHook}
                  actionMessageParams={actionMessageParams}
                  ruleType={rule?.type}
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
      rule?.type,
      loading,
      defineStep.data,
      isLoading,
      isSavedQueryLoading,
      defineStepDataWithSavedQuery,
      setFormHook,
      dataViewOptions,
      indicesConfig,
      threatIndicesConfig,
      onDataChange,
      aboutStep.data,
      scheduleStep.data,
      actionsStep.data,
      actionMessageParams,
      savedQuery,
    ]
  );

  const { startTransaction } = useStartTransaction();

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
      startTransaction({ name: SINGLE_RULE_ACTIONS.SAVE });
      await updateRule({
        ...formatRule<RuleUpdateProps>(
          define.data,
          about.data,
          schedule.data,
          actions.data,
          rule?.exceptions_list
        ),
        ...(ruleId ? { id: ruleId } : {}),
        ...(rule != null ? { max_signals: rule.max_signals } : {}),
      });

      displaySuccessToast(i18n.SUCCESSFULLY_SAVED_RULE(rule?.name ?? ''), dispatchToaster);
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(ruleId ?? ''),
      });
    }
  }, [
    aboutStep,
    actionsStep,
    activeStep,
    defineStep,
    dispatchToaster,
    navigateToApp,
    rule,
    ruleId,
    scheduleStep,
    setStepData,
    updateRule,
    startTransaction,
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
            >
              {defineStep.data && aboutStep.data && scheduleStep.data && (
                <EuiButton
                  iconType="visBarVerticalStacked"
                  onClick={() => setIsRulePreviewVisible((isVisible) => !isVisible)}
                >
                  {ruleI18n.RULE_PREVIEW_TITLE}
                </EuiButton>
              )}
            </HeaderPage>
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
            {isRulePreviewVisible && defineStep.data && aboutStep.data && scheduleStep.data && (
              <PreviewFlyout
                isDisabled={isPreviewDisabled}
                defineStepData={defineStep.data}
                aboutStepData={aboutStep.data}
                scheduleStepData={scheduleStep.data}
                exceptionsList={rule?.exceptions_list}
                onClose={onPreviewClose}
              />
            )}
          </MaxWidthEuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rules} state={{ ruleName: rule?.name }} />
    </>
  );
};

export const EditRulePage = memo(EditRulePageComponent);
