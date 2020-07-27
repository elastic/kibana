/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFormRow } from '@elastic/eui';
import React, { FC, memo, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/public';
import { useFetchIndexPatterns } from '../../../containers/detection_engine/rules';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { useMlCapabilities } from '../../../../common/components/ml_popover/hooks/use_ml_capabilities';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import {
  filterRuleFieldsForType,
  RuleFields,
} from '../../../pages/detection_engine/rules/create/helpers';
import {
  DefineStepRule,
  RuleStep,
  RuleStepProps,
} from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { QueryBarDefineRule } from '../query_bar';
import { SelectRuleType } from '../select_rule_type';
import { AnomalyThresholdSlider } from '../anomaly_threshold_slider';
import { MlJobSelect } from '../ml_job_select';
import { PickTimeline } from '../pick_timeline';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { ThresholdInput } from '../threshold_input';
import {
  Field,
  Form,
  getUseField,
  UseField,
  UseMultiFields,
  FormDataProvider,
  useForm,
  FormSchema,
} from '../../../../shared_imports';
import { schema } from './schema';
import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface StepDefineRuleProps extends RuleStepProps {
  defaultValues?: DefineStepRule | null;
}

const stepDefineDefaultValue: DefineStepRule = {
  anomalyThreshold: 50,
  index: [],
  isNew: true,
  machineLearningJobId: '',
  ruleType: 'query',
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: undefined,
  },
  threshold: {
    field: [],
    value: '200',
  },
  timeline: {
    id: null,
    title: DEFAULT_TIMELINE_TITLE,
  },
};

const MyLabelButton = styled(EuiButtonEmpty)`
  height: 18px;
  font-size: 12px;

  .euiIcon {
    width: 14px;
    height: 14px;
  }
`;

MyLabelButton.defaultProps = {
  flush: 'right',
};

const RuleTypeEuiFormRow = styled(EuiFormRow).attrs<{ $isVisible: boolean }>(({ $isVisible }) => ({
  style: {
    display: $isVisible ? 'flex' : 'none',
  },
}))<{ $isVisible: boolean }>``;

const StepDefineRuleComponent: FC<StepDefineRuleProps> = ({
  addPadding = false,
  defaultValues,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  setForm,
  setStepData,
}) => {
  const mlCapabilities = useMlCapabilities();
  const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
  const [indexModified, setIndexModified] = useState(false);
  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const initialState = defaultValues ?? {
    ...stepDefineDefaultValue,
    index: indicesConfig ?? [],
  };
  const [localRuleType, setLocalRuleType] = useState(initialState.ruleType);
  const [myStepData, setMyStepData] = useState<DefineStepRule>(initialState);
  const [
    { browserFields, indexPatterns: indexPatternQueryBar, isLoading: indexPatternLoadingQueryBar },
  ] = useFetchIndexPatterns(myStepData.index);

  const { form } = useForm({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, reset, submit } = form;
  const clearErrors = useCallback(() => reset({ resetValues: false }), [reset]);

  const onSubmit = useCallback(async () => {
    if (setStepData) {
      setStepData(RuleStep.defineRule, null, false);
      const { isValid, data } = await submit();
      if (isValid && setStepData) {
        setStepData(RuleStep.defineRule, data, isValid);
        setMyStepData({ ...data, isNew: false } as DefineStepRule);
      }
    }
  }, [setStepData, submit]);

  useEffect(() => {
    if (setForm) {
      setForm(RuleStep.defineRule, form);
    }
  }, [form, setForm]);

  const handleResetIndices = useCallback(() => {
    const indexField = getFields().index;
    indexField.setValue(indicesConfig);
  }, [getFields, indicesConfig]);

  const handleOpenTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(true);
  }, []);

  const handleCloseTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(false);
  }, []);

  const ThresholdInputChildren = useCallback(
    ({ thresholdField, thresholdValue }) => (
      <ThresholdInput
        browserFields={browserFields}
        thresholdField={thresholdField}
        thresholdValue={thresholdValue}
      />
    ),
    [browserFields]
  );

  return isReadOnlyView ? (
    <StepContentWrapper data-test-subj="definitionRule" addPadding={addPadding}>
      <StepRuleDescription
        columns={descriptionColumns}
        indexPatterns={indexPatternQueryBar as IIndexPattern}
        schema={filterRuleFieldsForType(schema as FormSchema & RuleFields, myStepData.ruleType)}
        data={filterRuleFieldsForType(myStepData, myStepData.ruleType)}
      />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepDefineRule">
          <UseField
            path="ruleType"
            component={SelectRuleType}
            componentProps={{
              describedByIds: ['detectionEngineStepDefineRuleType'],
              isReadOnly: isUpdateView,
              hasValidLicense: mlCapabilities.isPlatinumOrTrialLicense,
              isMlAdmin: hasMlAdminPermissions(mlCapabilities),
            }}
          />
          <RuleTypeEuiFormRow $isVisible={!isMlRule(localRuleType)} fullWidth>
            <>
              <CommonUseField
                path="index"
                config={{
                  ...schema.index,
                  labelAppend: indexModified ? (
                    <MyLabelButton onClick={handleResetIndices} iconType="refresh">
                      {i18n.RESET_DEFAULT_INDEX}
                    </MyLabelButton>
                  ) : null,
                }}
                componentProps={{
                  idAria: 'detectionEngineStepDefineRuleIndices',
                  'data-test-subj': 'detectionEngineStepDefineRuleIndices',
                  euiFieldProps: {
                    fullWidth: true,
                    isDisabled: isLoading,
                    placeholder: '',
                  },
                }}
              />
              <UseField
                path="queryBar"
                config={{
                  ...schema.queryBar,
                  labelAppend: (
                    <MyLabelButton
                      data-test-subj="importQueryFromSavedTimeline"
                      onClick={handleOpenTimelineSearch}
                    >
                      {i18n.IMPORT_TIMELINE_QUERY}
                    </MyLabelButton>
                  ),
                }}
                component={QueryBarDefineRule}
                componentProps={{
                  browserFields,
                  idAria: 'detectionEngineStepDefineRuleQueryBar',
                  indexPattern: indexPatternQueryBar,
                  isDisabled: isLoading,
                  isLoading: indexPatternLoadingQueryBar,
                  dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
                  openTimelineSearch,
                  onCloseTimelineSearch: handleCloseTimelineSearch,
                }}
              />
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow $isVisible={isMlRule(localRuleType)} fullWidth>
            <>
              <UseField
                path="machineLearningJobId"
                component={MlJobSelect}
                componentProps={{
                  describedByIds: ['detectionEngineStepDefineRulemachineLearningJobId'],
                }}
              />
              <UseField
                path="anomalyThreshold"
                component={AnomalyThresholdSlider}
                componentProps={{
                  describedByIds: ['detectionEngineStepDefineRuleAnomalyThreshold'],
                }}
              />
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow
            $isVisible={localRuleType === 'threshold'}
            data-test-subj="thresholdInput"
            fullWidth
          >
            <>
              <UseMultiFields
                fields={{
                  thresholdField: {
                    path: 'threshold.field',
                    defaultValue: initialState.threshold.field,
                  },
                  thresholdValue: {
                    path: 'threshold.value',
                    defaultValue: initialState.threshold.value,
                  },
                }}
              >
                {ThresholdInputChildren}
              </UseMultiFields>
            </>
          </RuleTypeEuiFormRow>
          <UseField
            path="timeline"
            component={PickTimeline}
            componentProps={{
              idAria: 'detectionEngineStepDefineRuleTimeline',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepDefineRuleTimeline',
            }}
          />
          <FormDataProvider pathsToWatch={['index', 'ruleType']}>
            {({ index, ruleType }) => {
              if (index != null) {
                if (deepEqual(index, indicesConfig) && indexModified) {
                  setIndexModified(false);
                } else if (!deepEqual(index, indicesConfig) && !indexModified) {
                  setIndexModified(true);
                }
                if (myStepData.index !== index) {
                  setMyStepData((prevValue) => ({ ...prevValue, index }));
                }
              }

              if (ruleType !== localRuleType) {
                setLocalRuleType(ruleType);
                clearErrors();
              }
              return null;
            }}
          </FormDataProvider>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="define-continue" onClick={onSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepDefineRule = memo(StepDefineRuleComponent);
