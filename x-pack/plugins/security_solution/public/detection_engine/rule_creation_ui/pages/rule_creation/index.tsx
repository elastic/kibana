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
  EuiResizableContainer,
  EuiFlexItem,
} from '@elastic/eui';
import React, { memo, useCallback, useRef, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  isMlRule,
  isThreatMatchRule,
  isEsqlRule,
} from '../../../../../common/detection_engine/utils';
import { useCreateRule } from '../../../rule_management/logic';
import type { RuleCreateProps } from '../../../../../common/api/detection_engine/model/rule_schema';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { hasUserCRUDPermission } from '../../../../common/utils/privileges';

import {
  getDetectionEngineUrl,
  getRuleDetailsUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../detections/components/user_info';
import { AccordionTitle } from '../../components/accordion_title';
import { StepDefineRule, StepDefineRuleReadOnly } from '../../components/step_define_rule';
import { useExperimentalFeatureFieldsTransform } from '../../components/step_define_rule/use_experimental_feature_fields_transform';
import { StepAboutRule, StepAboutRuleReadOnly } from '../../components/step_about_rule';
import { StepScheduleRule, StepScheduleRuleReadOnly } from '../../components/step_schedule_rule';
import {
  stepActionsDefaultValue,
  StepRuleActions,
  StepRuleActionsReadOnly,
} from '../../../rule_creation/components/step_rule_actions';
import * as RuleI18n from '../../../../detections/pages/detection_engine/rules/translations';
import {
  redirectToDetections,
  getActionMessageParams,
  MaxWidthEuiFlexItem,
} from '../../../../detections/pages/detection_engine/rules/helpers';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { RuleStep } from '../../../../detections/pages/detection_engine/rules/types';
import { formatRule } from './helpers';
import { useEsqlIndex, useEsqlQueryForAboutStep } from '../../hooks';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../app/types';
import {
  defaultSchedule,
  defaultThreatMatchSchedule,
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
import { RulePreview } from '../../components/rule_preview';
import { getIsRulePreviewDisabled } from '../../components/rule_preview/helpers';
import { useStartMlJobs } from '../../../rule_management/logic/use_start_ml_jobs';
import { NextStep } from '../../components/next_step';
import { useRuleForms, useRuleFormsErrors, useRuleIndexPattern } from '../form';
import { CustomHeaderPageMemo } from '..';
import { SaveWithErrorsModal } from '../../components/save_with_errors_confirmation';
import { ALERT_SUPPRESSION_FIELDS_FIELD_NAME } from '../../../rule_creation/components/alert_suppression_edit';

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
  const { addSuccess } = useAppToasts();
  const { navigateToApp } = useKibana().services.application;
  const { application, triggersActionsUi } = useKibana().services;
  const loading = userInfoLoading || listsConfigLoading;
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
  const defineStepDefault = useMemo(
    () => ({
      ...stepDefineDefaultValue,
      index: indicesConfig,
      threatIndex: threatIndicesConfig,
    }),
    [indicesConfig, threatIndicesConfig]
  );

  const kibanaAbsoluteUrl = useMemo(
    () =>
      application.getUrlForApp(`${APP_UI_ID}`, {
        absolute: true,
      }),
    [application]
  );
  const actionsStepDefault = useMemo(
    () => ({
      ...stepActionsDefaultValue,
      kibanaSiemAppUrl: kibanaAbsoluteUrl,
    }),
    [kibanaAbsoluteUrl]
  );

  const {
    defineStepForm,
    defineStepData,
    aboutStepForm,
    aboutStepData,
    scheduleStepForm,
    scheduleStepData,
    actionsStepForm,
    actionsStepData,
  } = useRuleForms({
    defineStepDefault,
    aboutStepDefault: stepAboutDefaultValue,
    scheduleStepDefault: defaultSchedule,
    actionsStepDefault,
  });

  const isThreatMatchRuleValue = useMemo(
    () => isThreatMatchRule(defineStepData.ruleType),
    [defineStepData.ruleType]
  );

  const isEsqlRuleValue = useMemo(
    () => isEsqlRule(defineStepData.ruleType),
    [defineStepData.ruleType]
  );

  const [openSteps, setOpenSteps] = useState({
    [RuleStep.defineRule]: false,
    [RuleStep.aboutRule]: false,
    [RuleStep.scheduleRule]: false,
    [RuleStep.ruleActions]: false,
  });
  const { mutateAsync: createRule, isLoading: isCreateRuleLoading } = useCreateRule();
  const ruleType = defineStepData.ruleType;
  const actionMessageParams = useMemo(() => getActionMessageParams(ruleType), [ruleType]);
  const [isRulePreviewVisible, setIsRulePreviewVisible] = useState(true);
  const collapseFn = useRef<() => void | undefined>();
  const [prevRuleType, setPrevRuleType] = useState<string>();
  const [isQueryBarValid, setIsQueryBarValid] = useState(false);
  const [isThreatQueryBarValid, setIsThreatQueryBarValid] = useState(false);

  const [isSaveWithErrorsModalVisible, setIsSaveWithErrorsModalVisible] = useState(false);
  const [enableRuleAfterConfirmation, setEnableRuleAfterConfirmation] = useState(false);
  const [nonBlockingRuleErrors, setNonBlockingRuleErrors] = useState<string[]>([]);

  const { getRuleFormsErrors } = useRuleFormsErrors();

  const esqlQueryForAboutStep = useEsqlQueryForAboutStep({ defineStepData, activeStep });

  const esqlIndex = useEsqlIndex(defineStepData.queryBar.query.query, ruleType);

  const memoizedIndex = useMemo(
    () => (isEsqlRuleValue ? esqlIndex : defineStepData.index),
    [defineStepData.index, esqlIndex, isEsqlRuleValue]
  );

  const defineFieldsTransform = useExperimentalFeatureFieldsTransform<DefineStepRule>();

  const isPreviewDisabled = getIsRulePreviewDisabled({
    ruleType,
    isQueryBarValid,
    isThreatQueryBarValid,
    index: memoizedIndex,
    dataViewId: defineStepData.dataViewId,
    dataSourceType: defineStepData.dataSourceType,
    threatIndex: defineStepData.threatIndex,
    threatMapping: defineStepData.threatMapping,
    machineLearningJobId: defineStepData.machineLearningJobId,
    queryBar: defineStepData.queryBar,
    newTermsFields: defineStepData.newTermsFields,
  });

  useEffect(() => {
    if (prevRuleType !== ruleType) {
      aboutStepForm.updateFieldValues({
        threatIndicatorPath: isThreatMatchRuleValue ? DEFAULT_INDICATOR_SOURCE_PATH : undefined,
      });
      scheduleStepForm.updateFieldValues(
        isThreatMatchRuleValue ? defaultThreatMatchSchedule : defaultSchedule
      );
      setPrevRuleType(ruleType);
    }
  }, [aboutStepForm, scheduleStepForm, isThreatMatchRuleValue, prevRuleType, ruleType]);

  const { starting: isStartingJobs, startMlJobs } = useStartMlJobs();

  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern({
    dataSourceType: defineStepData.dataSourceType,
    index: memoizedIndex,
    dataViewId: defineStepData.dataViewId,
  });

  const rulesUrl = getRulesUrl();
  const backOptions = useMemo(
    () => ({
      path: rulesUrl,
      text: i18n.BACK_TO_RULES,
      pageId: SecurityPageName.rules,
    }),
    [rulesUrl]
  );

  const handleAccordionToggle = useCallback(
    (step: RuleStep, isOpen: boolean) =>
      setOpenSteps((_openSteps) => ({
        ..._openSteps,
        [step]: isOpen,
      })),
    []
  );
  const toggleDefineStep = useCallback(
    (isOpen: boolean) => handleAccordionToggle(RuleStep.defineRule, isOpen),
    [handleAccordionToggle]
  );
  const toggleAboutStep = useCallback(
    (isOpen: boolean) => handleAccordionToggle(RuleStep.aboutRule, isOpen),
    [handleAccordionToggle]
  );
  const toggleScheduleStep = useCallback(
    (isOpen: boolean) => handleAccordionToggle(RuleStep.scheduleRule, isOpen),
    [handleAccordionToggle]
  );
  const toggleActionsStep = useCallback(
    (isOpen: boolean) => handleAccordionToggle(RuleStep.ruleActions, isOpen),
    [handleAccordionToggle]
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

  const validateStep = useCallback(
    async (step: RuleStep) => {
      switch (step) {
        case RuleStep.defineRule: {
          const valid = await defineStepForm.validate();
          const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ defineStepForm });
          return { valid, blockingErrors, nonBlockingErrors };
        }
        case RuleStep.aboutRule: {
          const valid = await aboutStepForm.validate();
          const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ aboutStepForm });
          return { valid, blockingErrors, nonBlockingErrors };
        }
        case RuleStep.scheduleRule: {
          const valid = await scheduleStepForm.validate();
          const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ scheduleStepForm });
          return { valid, blockingErrors, nonBlockingErrors };
        }
        case RuleStep.ruleActions: {
          const valid = await actionsStepForm.validate();
          const { blockingErrors, nonBlockingErrors } = getRuleFormsErrors({ actionsStepForm });
          return { valid, blockingErrors, nonBlockingErrors };
        }
      }
    },
    [aboutStepForm, actionsStepForm, defineStepForm, getRuleFormsErrors, scheduleStepForm]
  );

  const validateEachStep = useCallback(async () => {
    const {
      valid: defineStepFormValid,
      blockingErrors: defineStepBlockingErrors,
      nonBlockingErrors: defineStepNonBlockingErrors,
    } = await validateStep(RuleStep.defineRule);
    const {
      valid: aboutStepFormValid,
      blockingErrors: aboutStepBlockingErrors,
      nonBlockingErrors: aboutStepNonBlockingErrors,
    } = await validateStep(RuleStep.aboutRule);
    const {
      valid: scheduleStepFormValid,
      blockingErrors: scheduleStepBlockingErrors,
      nonBlockingErrors: scheduleStepNonBlockingErrors,
    } = await validateStep(RuleStep.scheduleRule);
    const {
      valid: actionsStepFormValid,
      blockingErrors: actionsStepBlockingErrors,
      nonBlockingErrors: actionsStepNonBlockingErrors,
    } = await validateStep(RuleStep.ruleActions);
    const valid =
      defineStepFormValid && aboutStepFormValid && scheduleStepFormValid && actionsStepFormValid;

    const blockingErrors = [
      ...defineStepBlockingErrors,
      ...aboutStepBlockingErrors,
      ...scheduleStepBlockingErrors,
      ...actionsStepBlockingErrors,
    ];
    const nonBlockingErrors = [
      ...defineStepNonBlockingErrors,
      ...aboutStepNonBlockingErrors,
      ...scheduleStepNonBlockingErrors,
      ...actionsStepNonBlockingErrors,
    ];

    return { valid, blockingErrors, nonBlockingErrors };
  }, [validateStep]);

  const editStep = useCallback(
    async (step: RuleStep) => {
      const { valid, blockingErrors } = await validateStep(activeStep);
      if (valid || !blockingErrors.length) {
        goToStep(step);
      }
    },
    [validateStep, activeStep, goToStep]
  );

  const createRuleFromFormData = useCallback(
    async (enabled: boolean) => {
      const localDefineStepData: DefineStepRule = defineFieldsTransform(
        defineStepForm.getFormData()
      );
      const localAboutStepData = aboutStepForm.getFormData();
      const localScheduleStepData = scheduleStepForm.getFormData();
      const localActionsStepData = actionsStepForm.getFormData();
      const startMlJobsIfNeeded = async () => {
        if (!isMlRule(ruleType) || !enabled) {
          return;
        }
        await startMlJobs(localDefineStepData.machineLearningJobId);
      };
      const [, createdRule] = await Promise.all([
        startMlJobsIfNeeded(),
        createRule(
          formatRule<RuleCreateProps>(
            localDefineStepData,
            localAboutStepData,
            localScheduleStepData,
            {
              ...localActionsStepData,
              enabled,
            },
            triggersActionsUi.actionTypeRegistry
          )
        ),
      ]);

      addSuccess(i18n.SUCCESSFULLY_CREATED_RULES(createdRule.name));

      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsUrl(createdRule.id),
      });
    },
    [
      aboutStepForm,
      actionsStepForm,
      addSuccess,
      createRule,
      defineFieldsTransform,
      defineStepForm,
      navigateToApp,
      ruleType,
      scheduleStepForm,
      startMlJobs,
      triggersActionsUi.actionTypeRegistry,
    ]
  );

  const showSaveWithErrorsModal = useCallback(() => setIsSaveWithErrorsModalVisible(true), []);
  const closeSaveWithErrorsModal = useCallback(() => setIsSaveWithErrorsModalVisible(false), []);
  const onConfirmSaveWithErrors = useCallback(async () => {
    closeSaveWithErrorsModal();
    await createRuleFromFormData(enableRuleAfterConfirmation);
  }, [closeSaveWithErrorsModal, createRuleFromFormData, enableRuleAfterConfirmation]);

  const submitRule = useCallback(
    async (enabled: boolean) => {
      const { valid, blockingErrors, nonBlockingErrors } = await validateEachStep();
      if (valid) {
        // There are no validation errors, thus proceed to rule creation
        await createRuleFromFormData(enabled);
        return;
      }

      if (blockingErrors.length > 0) {
        // There are blocking validation errors, thus do not allow user to create a rule
        return;
      }
      if (nonBlockingErrors.length > 0) {
        // There are non-blocking validation errors, thus confirm that user understand that this can cause rule failures
        setEnableRuleAfterConfirmation(enabled);
        setNonBlockingRuleErrors(nonBlockingErrors);
        showSaveWithErrorsModal();
      }
    },
    [createRuleFromFormData, showSaveWithErrorsModal, validateEachStep]
  );

  const defineRuleButtonType =
    activeStep === RuleStep.defineRule ? 'active' : defineStepForm.isValid ? 'valid' : 'passive';
  const defineRuleButton = useMemo(
    () => <AccordionTitle name="1" title={RuleI18n.DEFINE_RULE} type={defineRuleButtonType} />,
    [defineRuleButtonType]
  );
  const defineRuleNextStep = useCallback(async () => {
    const nextStep = getNextStep(RuleStep.defineRule);
    if (nextStep) {
      await editStep(nextStep);
    }
  }, [editStep]);

  const aboutRuleButtonType =
    activeStep === RuleStep.aboutRule ? 'active' : aboutStepForm.isValid ? 'valid' : 'passive';
  const aboutRuleButton = useMemo(
    () => <AccordionTitle name="2" title={RuleI18n.ABOUT_RULE} type={aboutRuleButtonType} />,
    [aboutRuleButtonType]
  );
  const aboutRuleNextStep = useCallback(async () => {
    const nextStep = getNextStep(RuleStep.aboutRule);
    if (nextStep) {
      await editStep(nextStep);
    }
  }, [editStep]);

  const scheduleRuleButtonType =
    activeStep === RuleStep.scheduleRule
      ? 'active'
      : scheduleStepForm.isValid
      ? 'valid'
      : 'passive';
  const scheduleRuleButton = useMemo(
    () => <AccordionTitle name="3" title={RuleI18n.SCHEDULE_RULE} type={scheduleRuleButtonType} />,
    [scheduleRuleButtonType]
  );
  const scheduleRuleNextStep = useCallback(async () => {
    const nextStep = getNextStep(RuleStep.scheduleRule);
    if (nextStep) {
      await editStep(nextStep);
    }
  }, [editStep]);

  const actionsRuleButtonType =
    activeStep === RuleStep.ruleActions ? 'active' : actionsStepForm.isValid ? 'valid' : 'passive';
  const ruleActionsButton = useMemo(
    () => <AccordionTitle name="4" title={RuleI18n.RULE_ACTIONS} type={actionsRuleButtonType} />,
    [actionsRuleButtonType]
  );
  const submitRuleDisabled = useCallback(() => {
    submitRule(false);
  }, [submitRule]);
  const submitRuleEnabled = useCallback(() => {
    submitRule(true);
  }, [submitRule]);

  const memoDefineStepReadOnly = useMemo(
    () =>
      activeStep !== RuleStep.defineRule && (
        <StepDefineRuleReadOnly
          addPadding
          defaultValues={defineStepData}
          descriptionColumns="singleSplit"
          indexPattern={indexPattern}
        />
      ),
    [activeStep, defineStepData, indexPattern]
  );
  const memoStepDefineRule = useMemo(
    () => (
      <>
        <EuiHorizontalRule margin="m" />
        <div
          style={{
            display: activeStep === RuleStep.defineRule ? undefined : 'none',
          }}
        >
          <StepDefineRule
            isLoading={isCreateRuleLoading || loading}
            indicesConfig={indicesConfig}
            threatIndicesConfig={threatIndicesConfig}
            form={defineStepForm}
            indexPattern={indexPattern}
            isIndexPatternLoading={isIndexPatternLoading}
            isQueryBarValid={isQueryBarValid}
            setIsQueryBarValid={setIsQueryBarValid}
            setIsThreatQueryBarValid={setIsThreatQueryBarValid}
            index={memoizedIndex}
            threatIndex={defineStepData.threatIndex}
            alertSuppressionFields={defineStepData[ALERT_SUPPRESSION_FIELDS_FIELD_NAME]}
            dataSourceType={defineStepData.dataSourceType}
            shouldLoadQueryDynamically={defineStepData.shouldLoadQueryDynamically}
            queryBarTitle={defineStepData.queryBar.title}
            queryBarSavedId={defineStepData.queryBar.saved_id}
            thresholdFields={defineStepData?.threshold?.field || []}
          />
          <NextStep
            dataTestSubj="define-continue"
            onClick={defineRuleNextStep}
            isDisabled={isCreateRuleLoading}
          />
        </div>
        {memoDefineStepReadOnly}
      </>
    ),
    [
      activeStep,
      defineRuleNextStep,
      defineStepData,
      memoizedIndex,
      defineStepForm,
      indexPattern,
      indicesConfig,
      isCreateRuleLoading,
      isIndexPatternLoading,
      isQueryBarValid,
      loading,
      memoDefineStepReadOnly,
      threatIndicesConfig,
    ]
  );
  const memoDefineStepExtraAction = useMemo(
    () =>
      // During rule creation we would like to hide the edit button if user did not reach current step yet,
      // thus we do `defineStepForm.isValid !== undefined` check which that the form validation has not been checked yet.
      // Otherwise, we would like to show step edit button if user is currently at another step.
      defineStepForm.isValid !== undefined &&
      activeStep !== RuleStep.defineRule && (
        <EuiButtonEmpty
          data-test-subj="edit-define-rule"
          iconType="pencil"
          size="xs"
          onClick={() => editStep(RuleStep.defineRule)}
        >
          {i18n.EDIT_RULE}
        </EuiButtonEmpty>
      ),
    [activeStep, defineStepForm.isValid, editStep]
  );

  const memoAboutStepReadOnly = useMemo(
    () =>
      activeStep !== RuleStep.aboutRule && (
        <StepAboutRuleReadOnly
          addPadding
          defaultValues={aboutStepData}
          descriptionColumns="singleSplit"
        />
      ),
    [aboutStepData, activeStep]
  );
  const memoStepAboutRule = useMemo(
    () => (
      <>
        <EuiHorizontalRule margin="m" />
        <div
          style={{
            display: activeStep === RuleStep.aboutRule ? undefined : 'none',
          }}
        >
          <StepAboutRule
            ruleType={defineStepData.ruleType}
            machineLearningJobId={defineStepData.machineLearningJobId}
            index={memoizedIndex}
            dataViewId={defineStepData.dataViewId}
            timestampOverride={aboutStepData.timestampOverride}
            isLoading={isCreateRuleLoading || loading}
            form={aboutStepForm}
            esqlQuery={esqlQueryForAboutStep}
          />

          <NextStep
            dataTestSubj="about-continue"
            onClick={aboutRuleNextStep}
            isDisabled={isCreateRuleLoading}
          />
        </div>
        {memoAboutStepReadOnly}
      </>
    ),
    [
      aboutRuleNextStep,
      aboutStepData.timestampOverride,
      aboutStepForm,
      activeStep,
      defineStepData.dataViewId,
      memoizedIndex,
      defineStepData.machineLearningJobId,
      defineStepData.ruleType,
      isCreateRuleLoading,
      loading,
      memoAboutStepReadOnly,
      esqlQueryForAboutStep,
    ]
  );
  const memoAboutStepExtraAction = useMemo(
    () =>
      // During rule creation we would like to hide the edit button if user did not reach current step yet,
      // thus we do `defineStepForm.isValid !== undefined` check which that the form validation has not been checked yet.
      // Otherwise, we would like to show step edit button if user is currently at another step.
      aboutStepForm.isValid !== undefined &&
      activeStep !== RuleStep.aboutRule && (
        <EuiButtonEmpty
          data-test-subj="edit-about-rule"
          iconType="pencil"
          size="xs"
          onClick={() => editStep(RuleStep.aboutRule)}
        >
          {i18n.EDIT_RULE}
        </EuiButtonEmpty>
      ),
    [aboutStepForm.isValid, activeStep, editStep]
  );

  const memoStepScheduleRule = useMemo(
    () => (
      <>
        <EuiHorizontalRule margin="m" />
        <div
          style={{
            display: activeStep === RuleStep.scheduleRule ? undefined : 'none',
          }}
        >
          <StepScheduleRule isLoading={isCreateRuleLoading || loading} form={scheduleStepForm} />
          <NextStep
            dataTestSubj="schedule-continue"
            onClick={scheduleRuleNextStep}
            isDisabled={isCreateRuleLoading}
          />
        </div>
        <div
          style={{
            display: activeStep === RuleStep.scheduleRule ? 'none' : undefined,
          }}
        >
          <StepScheduleRuleReadOnly
            addPadding
            descriptionColumns="singleSplit"
            defaultValues={scheduleStepData}
          />
        </div>
      </>
    ),
    [
      activeStep,
      isCreateRuleLoading,
      loading,
      scheduleRuleNextStep,
      scheduleStepData,
      scheduleStepForm,
    ]
  );
  const memoScheduleStepExtraAction = useMemo(
    () =>
      // During rule creation we would like to hide the edit button if user did not reach current step yet,
      // thus we do `defineStepForm.isValid !== undefined` check which that the form validation has not been checked yet.
      // Otherwise, we would like to show step edit button if user is currently at another step.
      scheduleStepForm.isValid !== undefined &&
      activeStep !== RuleStep.scheduleRule && (
        <EuiButtonEmpty iconType="pencil" size="xs" onClick={() => editStep(RuleStep.scheduleRule)}>
          {i18n.EDIT_RULE}
        </EuiButtonEmpty>
      ),
    [activeStep, editStep, scheduleStepForm.isValid]
  );

  const memoStepRuleActions = useMemo(
    () => (
      <>
        <EuiHorizontalRule margin="m" />
        <div
          style={{
            display: activeStep === RuleStep.ruleActions ? undefined : 'none',
          }}
        >
          <StepRuleActions
            isLoading={isCreateRuleLoading || loading || isStartingJobs}
            actionMessageParams={actionMessageParams}
            summaryActionMessageParams={actionMessageParams}
            form={actionsStepForm}
          />

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
                isDisabled={isCreateRuleLoading}
                isLoading={isCreateRuleLoading}
                onClick={submitRuleDisabled}
                data-test-subj="create-enabled-false"
              >
                {i18n.COMPLETE_WITHOUT_ENABLING}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isCreateRuleLoading}
                isLoading={isCreateRuleLoading}
                onClick={submitRuleEnabled}
                data-test-subj="create-enable"
              >
                {i18n.COMPLETE_WITH_ENABLING}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div
          style={{
            display: activeStep === RuleStep.ruleActions ? 'none' : undefined,
          }}
        >
          <StepRuleActionsReadOnly addPadding defaultValues={actionsStepData} />
        </div>
      </>
    ),
    [
      actionMessageParams,
      actionsStepData,
      actionsStepForm,
      activeStep,
      isCreateRuleLoading,
      isStartingJobs,
      loading,
      submitRuleDisabled,
      submitRuleEnabled,
    ]
  );
  const memoActionsStepExtraAction = useMemo(
    () =>
      // During rule creation we would like to hide the edit button if user did not reach current step yet,
      // thus we do `defineStepForm.isValid !== undefined` check which that the form validation has not been checked yet.
      // Otherwise, we would like to show step edit button if user is currently at another step.
      actionsStepForm.isValid !== undefined &&
      activeStep !== RuleStep.ruleActions && (
        <EuiButtonEmpty iconType="pencil" size="xs" onClick={() => editStep(RuleStep.ruleActions)}>
          {i18n.EDIT_RULE}
        </EuiButtonEmpty>
      ),
    [actionsStepForm.isValid, activeStep, editStep]
  );

  const onToggleCollapsedMemo = useCallback(
    () => setIsRulePreviewVisible((isVisible) => !isVisible),
    []
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
  } else if (!hasUserCRUDPermission(canUserCRUD)) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });
    return null;
  }

  return (
    <>
      {isSaveWithErrorsModalVisible && (
        <SaveWithErrorsModal
          errors={nonBlockingRuleErrors}
          onCancel={closeSaveWithErrorsModal}
          onConfirm={onConfirmSaveWithErrors}
        />
      )}
      <SecuritySolutionPageWrapper>
        <EuiResizableContainer>
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            collapseFn.current = () => togglePanel?.('preview', { direction: 'left' });
            return (
              <>
                <EuiResizablePanel initialSize={70} minSize={'40%'} mode="main">
                  <EuiFlexGroup direction="row" justifyContent="spaceAround">
                    <MaxWidthEuiFlexItem>
                      <CustomHeaderPageMemo
                        backOptions={backOptions}
                        isLoading={isCreateRuleLoading || loading}
                        title={i18n.PAGE_TITLE}
                        isRulePreviewVisible={isRulePreviewVisible}
                        setIsRulePreviewVisible={setIsRulePreviewVisible}
                        togglePanel={togglePanel}
                      />
                      <MyEuiPanel zindex={4} hasBorder>
                        <MemoEuiAccordion
                          initialIsOpen={true}
                          id={RuleStep.defineRule}
                          buttonContent={defineRuleButton}
                          paddingSize="xs"
                          ref={defineRuleRef}
                          onToggle={toggleDefineStep}
                          extraAction={memoDefineStepExtraAction}
                        >
                          {memoStepDefineRule}
                        </MemoEuiAccordion>
                      </MyEuiPanel>
                      <EuiSpacer size="l" />
                      <MyEuiPanel hasBorder zindex={3}>
                        <MemoEuiAccordion
                          initialIsOpen={false}
                          id={RuleStep.aboutRule}
                          buttonContent={aboutRuleButton}
                          paddingSize="xs"
                          ref={aboutRuleRef}
                          onToggle={toggleAboutStep}
                          extraAction={memoAboutStepExtraAction}
                        >
                          {memoStepAboutRule}
                        </MemoEuiAccordion>
                      </MyEuiPanel>
                      <EuiSpacer size="l" />
                      <MyEuiPanel hasBorder zindex={2}>
                        <MemoEuiAccordion
                          initialIsOpen={false}
                          id={RuleStep.scheduleRule}
                          buttonContent={scheduleRuleButton}
                          paddingSize="xs"
                          ref={scheduleRuleRef}
                          onToggle={toggleScheduleStep}
                          extraAction={memoScheduleStepExtraAction}
                        >
                          {memoStepScheduleRule}
                        </MemoEuiAccordion>
                      </MyEuiPanel>
                      <EuiSpacer size="l" />
                      <MyEuiPanel hasBorder zindex={1}>
                        <MemoEuiAccordion
                          initialIsOpen={false}
                          id={RuleStep.ruleActions}
                          buttonContent={ruleActionsButton}
                          paddingSize="xs"
                          ref={ruleActionsRef}
                          onToggle={toggleActionsStep}
                          extraAction={memoActionsStepExtraAction}
                        >
                          {memoStepRuleActions}
                        </MemoEuiAccordion>
                      </MyEuiPanel>
                    </MaxWidthEuiFlexItem>
                  </EuiFlexGroup>
                </EuiResizablePanel>

                <EuiResizableButton />

                <EuiResizablePanel
                  id={'preview'}
                  mode="collapsible"
                  initialSize={30}
                  minSize={'20%'}
                  onToggleCollapsed={onToggleCollapsedMemo}
                >
                  <RulePreview
                    isDisabled={isPreviewDisabled && activeStep === RuleStep.defineRule}
                    defineRuleData={defineStepData}
                    aboutRuleData={aboutStepData}
                    scheduleRuleData={scheduleStepData}
                  />
                </EuiResizablePanel>
              </>
            );
          }}
        </EuiResizableContainer>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rulesCreate} />
    </>
  );
};

export const CreateRulePage = React.memo(CreateRulePageComponent);

const MemoEuiAccordion = memo(EuiAccordion);
