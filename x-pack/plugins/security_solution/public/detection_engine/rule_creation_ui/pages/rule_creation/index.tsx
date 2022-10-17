/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiAccordion,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
} from '@elastic/eui';
import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { useCreateRule } from '../../../rule_management/logic';
import type { RuleCreateProps } from '../../../../../common/detection_engine/rule_schema';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';

import {
  getDetectionEngineUrl,
  getRuleDetailsUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { displaySuccessToast, useStateToaster } from '../../../../common/components/toasters';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { AccordionTitle } from '../../../../detections/components/rules/accordion_title';
import { StepDefineRule } from '../../../../detections/components/rules/step_define_rule';
import { StepAboutRule } from '../../../../detections/components/rules/step_about_rule';
import { StepScheduleRule } from '../../../../detections/components/rules/step_schedule_rule';
import { StepRuleActions } from '../../../../detections/components/rules/step_rule_actions';
import * as RuleI18n from '../../../../detections/pages/detection_engine/rules/translations';
import {
  redirectToDetections,
  getActionMessageParams,
  userHasPermissions,
  MaxWidthEuiFlexItem,
} from '../../../../detections/pages/detection_engine/rules/helpers';
import type {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  RuleStepsFormData,
  RuleStepsFormHooks,
  RuleStepsData,
} from '../../../../detections/pages/detection_engine/rules/types';
import { RuleStep } from '../../../../detections/pages/detection_engine/rules/types';
import { formatRule, stepIsValid } from './helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../app/types';
import {
  getStepScheduleDefaultValue,
  ruleStepsOrder,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../../../../detections/pages/detection_engine/rules/utils';
import {
  APP_UI_ID,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDICATOR_SOURCE_PATH,
  DEFAULT_THREAT_INDEX_KEY,
} from '../../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import { HeaderPage } from '../../../../common/components/header_page';
import { PreviewFlyout } from '../../../../detections/pages/detection_engine/rules/preview';

const formHookNoop = async (): Promise<undefined> => undefined;

const MyEuiPanel = styled(EuiPanel)<{
  zindex?: number;
}>`
  position: relative;
  z-index: ${(props) => props.zindex}; /* ugly fix to allow searchBar to overflow the EuiPanel */

  > .euiAccordion > .euiAccordion__triggerWrapper {
    .euiAccordion__button {
      cursor: default !important;
      &:hover {
        text-decoration: none !important;
      }
    }

    .euiAccordion__iconWrapper {
      display: none;
    }
  }
  .euiAccordion__childWrapper {
    transform: none; /* To circumvent an issue in Eui causing the fullscreen datagrid to break */
  }
`;

MyEuiPanel.displayName = 'MyEuiPanel';

const isShouldRerenderStep = (step: RuleStep, activeStep: RuleStep) =>
  activeStep !== step ? '0' : '1';

const CreateRulePageComponent: React.FC = () => {
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
  const { navigateToApp } = useKibana().services.application;
  const { data: dataServices } = useKibana().services;
  const loading = userInfoLoading || listsConfigLoading;
  const [, dispatchToaster] = useStateToaster();
  const [activeStep, setActiveStep] = useState<RuleStep>(RuleStep.defineRule);
  const getNextStep = (step: RuleStep): RuleStep | undefined =>
    ruleStepsOrder[ruleStepsOrder.indexOf(step) + 1];
  // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
  const defineRuleRef = useRef<EuiAccordion | null>(null);
  // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
  const aboutRuleRef = useRef<EuiAccordion | null>(null);
  // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
  const scheduleRuleRef = useRef<EuiAccordion | null>(null);
  // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
  const ruleActionsRef = useRef<EuiAccordion | null>(null);

  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [threatIndicesConfig] = useUiSetting$<string[]>(DEFAULT_THREAT_INDEX_KEY);

  const formHooks = useRef<RuleStepsFormHooks>({
    [RuleStep.defineRule]: formHookNoop,
    [RuleStep.aboutRule]: formHookNoop,
    [RuleStep.scheduleRule]: formHookNoop,
    [RuleStep.ruleActions]: formHookNoop,
  });
  const setFormHook = useCallback(
    <K extends keyof RuleStepsFormHooks>(step: K, hook: RuleStepsFormHooks[K]) => {
      formHooks.current[step] = hook;
    },
    []
  );
  const stepsData = useRef<RuleStepsFormData>({
    [RuleStep.defineRule]: { isValid: false, data: undefined },
    [RuleStep.aboutRule]: { isValid: false, data: undefined },
    [RuleStep.scheduleRule]: { isValid: false, data: undefined },
    [RuleStep.ruleActions]: { isValid: false, data: undefined },
  });
  const setStepData = <K extends keyof RuleStepsFormData>(
    step: K,
    data: RuleStepsFormData[K]
  ): void => {
    stepsData.current[step] = data;
  };
  const [openSteps, setOpenSteps] = useState({
    [RuleStep.defineRule]: false,
    [RuleStep.aboutRule]: false,
    [RuleStep.scheduleRule]: false,
    [RuleStep.ruleActions]: false,
  });
  const { mutateAsync: createRule, isLoading } = useCreateRule();
  const ruleType = stepsData.current[RuleStep.defineRule].data?.ruleType;
  const actionMessageParams = useMemo(() => getActionMessageParams(ruleType), [ruleType]);
  const [dataViewOptions, setDataViewOptions] = useState<{ [x: string]: DataViewListItem }>({});
  const [isPreviewDisabled, setIsPreviewDisabled] = useState(false);
  const [isRulePreviewVisible, setIsRulePreviewVisible] = useState(false);

  const [defineRuleData, setDefineRuleData] = useState<DefineStepRule>({
    ...stepDefineDefaultValue,
    index: indicesConfig,
    threatIndex: threatIndicesConfig,
  });
  const [aboutRuleData, setAboutRuleData] = useState<AboutStepRule>(stepAboutDefaultValue);
  const [scheduleRuleData, setScheduleRuleData] = useState<ScheduleStepRule>(
    getStepScheduleDefaultValue(defineRuleData.ruleType)
  );

  useEffect(() => {
    const isThreatMatchRuleValue = isThreatMatchRule(defineRuleData.ruleType);
    if (isThreatMatchRuleValue) {
      setAboutRuleData({
        ...stepAboutDefaultValue,
        threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
      });
    } else {
      setAboutRuleData(stepAboutDefaultValue);
    }
    setScheduleRuleData(getStepScheduleDefaultValue(defineRuleData.ruleType));
  }, [defineRuleData.ruleType]);

  const updateCurrentDataState = useCallback(
    <K extends keyof RuleStepsData>(data: RuleStepsData[K]) => {
      if (activeStep === RuleStep.defineRule) {
        setDefineRuleData(data as DefineStepRule);
      } else if (activeStep === RuleStep.aboutRule) {
        setAboutRuleData(data as AboutStepRule);
      } else if (activeStep === RuleStep.scheduleRule) {
        setScheduleRuleData(data as ScheduleStepRule);
      }
    },
    [activeStep]
  );

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

  const handleAccordionToggle = useCallback(
    (step: RuleStep, isOpen: boolean) =>
      setOpenSteps((_openSteps) => ({
        ..._openSteps,
        [step]: isOpen,
      })),
    []
  );
  const goToStep = useCallback(
    (step: RuleStep) => {
      if (ruleStepsOrder.indexOf(step) > ruleStepsOrder.indexOf(activeStep) && !openSteps[step]) {
        toggleStepAccordion(step);
      }
      setActiveStep(step);
    },
    [activeStep, openSteps]
  );

  const toggleStepAccordion = (step: RuleStep | null) => {
    if (step === RuleStep.defineRule) {
      defineRuleRef.current?.onToggle();
    } else if (step === RuleStep.aboutRule) {
      aboutRuleRef.current?.onToggle();
    } else if (step === RuleStep.scheduleRule) {
      scheduleRuleRef.current?.onToggle();
    } else if (step === RuleStep.ruleActions) {
      ruleActionsRef.current?.onToggle();
    }
  };

  const editStep = useCallback(
    async (step: RuleStep) => {
      const activeStepData = await formHooks.current[activeStep]();

      if (activeStepData?.isValid) {
        setStepData(activeStep, activeStepData);
        goToStep(step);
      }
    },
    [activeStep, goToStep]
  );
  const submitStep = useCallback(
    async (step: RuleStep) => {
      const stepData = await formHooks.current[step]();

      if (stepData?.isValid && stepData.data) {
        updateCurrentDataState(stepData.data);
        setStepData(step, stepData);
        const nextStep = getNextStep(step);

        if (nextStep != null) {
          goToStep(nextStep);
        } else {
          const defineStep = stepsData.current[RuleStep.defineRule];
          const aboutStep = stepsData.current[RuleStep.aboutRule];
          const scheduleStep = stepsData.current[RuleStep.scheduleRule];
          const actionsStep = stepsData.current[RuleStep.ruleActions];

          if (
            stepIsValid(defineStep) &&
            stepIsValid(aboutStep) &&
            stepIsValid(scheduleStep) &&
            stepIsValid(actionsStep)
          ) {
            const createdRule = await createRule(
              formatRule<RuleCreateProps>(
                defineStep.data,
                aboutStep.data,
                scheduleStep.data,
                actionsStep.data
              )
            );

            displaySuccessToast(i18n.SUCCESSFULLY_CREATED_RULES(createdRule.name), dispatchToaster);
            navigateToApp(APP_UI_ID, {
              deepLinkId: SecurityPageName.rules,
              path: getRuleDetailsUrl(createdRule.id),
            });
          }
        }
      }
    },
    [updateCurrentDataState, goToStep, createRule, dispatchToaster, navigateToApp]
  );

  const getAccordionType = useCallback(
    (step: RuleStep) => {
      if (step === activeStep) {
        return 'active';
      } else if (stepsData.current[step].isValid) {
        return 'valid';
      }
      return 'passive';
    },
    [activeStep]
  );

  const defineRuleButton = (
    <AccordionTitle
      name="1"
      title={RuleI18n.DEFINE_RULE}
      type={getAccordionType(RuleStep.defineRule)}
    />
  );
  const aboutRuleButton = (
    <AccordionTitle
      name="2"
      title={RuleI18n.ABOUT_RULE}
      type={getAccordionType(RuleStep.aboutRule)}
    />
  );
  const scheduleRuleButton = (
    <AccordionTitle
      name="3"
      title={RuleI18n.SCHEDULE_RULE}
      type={getAccordionType(RuleStep.scheduleRule)}
    />
  );
  const ruleActionsButton = (
    <AccordionTitle
      name="4"
      title={RuleI18n.RULE_ACTIONS}
      type={getAccordionType(RuleStep.ruleActions)}
    />
  );

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
      path: getRulesUrl(),
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
                path: getRulesUrl(),
                text: i18n.BACK_TO_RULES,
                pageId: SecurityPageName.rules,
              }}
              isLoading={isLoading || loading}
              title={i18n.PAGE_TITLE}
            >
              <EuiButton
                data-test-subj="preview-flyout"
                iconType="visBarVerticalStacked"
                onClick={() => setIsRulePreviewVisible((isVisible) => !isVisible)}
              >
                {i18n.RULE_PREVIEW_TITLE}
              </EuiButton>
            </HeaderPage>
            <MyEuiPanel zindex={4} hasBorder>
              <EuiAccordion
                initialIsOpen={true}
                id={RuleStep.defineRule}
                buttonContent={defineRuleButton}
                paddingSize="xs"
                ref={defineRuleRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.defineRule)}
                extraAction={
                  stepsData.current[RuleStep.defineRule].isValid && (
                    <EuiButtonEmpty
                      data-test-subj="edit-define-rule"
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.defineRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepDefineRule
                  addPadding={true}
                  defaultValues={defineRuleData}
                  isReadOnlyView={activeStep !== RuleStep.defineRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.defineRule)}
                  kibanaDataViews={dataViewOptions}
                  descriptionColumns="singleSplit"
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  key={isShouldRerenderStep(RuleStep.defineRule, activeStep)}
                  indicesConfig={indicesConfig}
                  threatIndicesConfig={threatIndicesConfig}
                  onRuleDataChange={updateCurrentDataState}
                  onPreviewDisabledStateChange={setIsPreviewDisabled}
                />
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={3}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.aboutRule}
                buttonContent={aboutRuleButton}
                paddingSize="xs"
                ref={aboutRuleRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.aboutRule)}
                extraAction={
                  stepsData.current[RuleStep.aboutRule].isValid && (
                    <EuiButtonEmpty
                      data-test-subj="edit-about-rule"
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.aboutRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepAboutRule
                  addPadding={true}
                  defaultValues={aboutRuleData}
                  defineRuleData={defineRuleData}
                  descriptionColumns="singleSplit"
                  isReadOnlyView={activeStep !== RuleStep.aboutRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.aboutRule)}
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  key={isShouldRerenderStep(RuleStep.aboutRule, activeStep)}
                  onRuleDataChange={updateCurrentDataState}
                />
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={2}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.scheduleRule}
                buttonContent={scheduleRuleButton}
                paddingSize="xs"
                ref={scheduleRuleRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.scheduleRule)}
                extraAction={
                  stepsData.current[RuleStep.scheduleRule].isValid && (
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.scheduleRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepScheduleRule
                  addPadding={true}
                  defaultValues={scheduleRuleData}
                  descriptionColumns="singleSplit"
                  isReadOnlyView={activeStep !== RuleStep.scheduleRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.scheduleRule)}
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  key={isShouldRerenderStep(RuleStep.scheduleRule, activeStep)}
                  onRuleDataChange={updateCurrentDataState}
                />
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={1}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.ruleActions}
                buttonContent={ruleActionsButton}
                paddingSize="xs"
                ref={ruleActionsRef}
                onToggle={handleAccordionToggle.bind(null, RuleStep.ruleActions)}
                extraAction={
                  stepsData.current[RuleStep.ruleActions].isValid && (
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      onClick={() => editStep(RuleStep.ruleActions)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepRuleActions
                  addPadding={true}
                  defaultValues={stepsData.current[RuleStep.ruleActions].data}
                  isReadOnlyView={activeStep !== RuleStep.ruleActions}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  onSubmit={() => submitStep(RuleStep.ruleActions)}
                  actionMessageParams={actionMessageParams}
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  key={isShouldRerenderStep(RuleStep.ruleActions, activeStep)}
                  ruleType={ruleType}
                />
              </EuiAccordion>
            </MyEuiPanel>
            {isRulePreviewVisible && (
              <PreviewFlyout
                isDisabled={isPreviewDisabled && activeStep === RuleStep.defineRule}
                defineStepData={defineRuleData}
                aboutStepData={aboutRuleData}
                scheduleStepData={scheduleRuleData}
                onClose={() => setIsRulePreviewVisible(false)}
              />
            )}
          </MaxWidthEuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rulesCreate} />
    </>
  );
};

export const CreateRulePage = React.memo(CreateRulePageComponent);
