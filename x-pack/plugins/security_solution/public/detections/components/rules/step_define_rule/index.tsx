/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFormRow } from '@elastic/eui';
import React, { FC, memo, useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import isEqual from 'lodash/isEqual';

import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useFetchIndexPatterns } from '../../../containers/detection_engine/rules';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
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
  useForm,
  useFormData,
} from '../../../../shared_imports';
import { schema } from './schema';
import * as i18n from './translations';
import { isEqlRule, isThresholdRule } from '../../../../../common/detection_engine/utils';
import { EqlQueryBar } from '../eql_query_bar';

const CommonUseField = getUseField({ component: Field });

interface StepDefineRuleProps extends RuleStepProps {
  defaultValues?: DefineStepRule;
}

const stepDefineDefaultValue: DefineStepRule = {
  anomalyThreshold: 50,
  index: [],
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
  onSubmit,
  setForm,
}) => {
  const mlCapabilities = useMlCapabilities();
  const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
  const [indexModified, setIndexModified] = useState(false);
  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const initialState = defaultValues ?? {
    ...stepDefineDefaultValue,
    index: indicesConfig,
  };
  const { form } = useForm<DefineStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, getFormData, reset, submit } = form;
  const [{ index: formIndex, ruleType: formRuleType }] = (useFormData({
    form,
    watch: ['index', 'ruleType'],
  }) as unknown) as [Partial<DefineStepRule>];
  const index = formIndex || initialState.index;
  const ruleType = formRuleType || initialState.ruleType;
  const [{ browserFields, indexPatterns, isLoading: indexPatternsLoading }] = useFetchIndexPatterns(
    index,
    RuleStep.defineRule
  );

  // reset form when rule type changes
  useEffect(() => {
    reset({ resetValues: false });
  }, [reset, ruleType]);

  useEffect(() => {
    setIndexModified(!isEqual(index, indicesConfig));
  }, [index, indicesConfig]);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

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
    if (setForm) {
      setForm(RuleStep.defineRule, getData);
    }
  }, [getData, setForm]);

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
        indexPatterns={indexPatterns}
        schema={filterRuleFieldsForType(schema as typeof schema & RuleFields, ruleType)}
        data={filterRuleFieldsForType(initialState, ruleType)}
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
              hasValidLicense: hasMlLicense(mlCapabilities),
              isMlAdmin: hasMlAdminPermissions(mlCapabilities),
            }}
          />
          <RuleTypeEuiFormRow $isVisible={!isMlRule(ruleType)} fullWidth>
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
              {isEqlRule(ruleType) ? (
                <UseField
                  key="EqlQueryBar"
                  path="queryBar"
                  component={EqlQueryBar}
                  componentProps={{
                    idAria: 'detectionEngineStepDefineRuleEqlQueryBar',
                    isDisabled: isLoading,
                    isLoading: indexPatternsLoading,
                    index,
                    dataTestSubj: 'detectionEngineStepDefineRuleEqlQueryBar',
                  }}
                  config={{
                    ...schema.queryBar,
                    label: i18n.EQL_QUERY_BAR_LABEL,
                  }}
                />
              ) : (
                <UseField
                  key="QueryBarDefineRule"
                  path="queryBar"
                  config={{
                    ...schema.queryBar,
                    label: i18n.QUERY_BAR_LABEL,
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
                    indexPattern: indexPatterns,
                    isDisabled: isLoading,
                    isLoading: indexPatternsLoading,
                    dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
                    openTimelineSearch,
                    onCloseTimelineSearch: handleCloseTimelineSearch,
                  }}
                />
              )}
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow $isVisible={isMlRule(ruleType)} fullWidth>
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
            $isVisible={isThresholdRule(ruleType)}
            data-test-subj="thresholdInput"
            fullWidth
          >
            <>
              <UseMultiFields
                fields={{
                  thresholdField: {
                    path: 'threshold.field',
                  },
                  thresholdValue: {
                    path: 'threshold.value',
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
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="define-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepDefineRule = memo(StepDefineRuleComponent);
