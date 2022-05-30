/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React, { FC, memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEqual, isEmpty } from 'lodash';
import { FieldSpec } from '@kbn/data-views-plugin/common';
import usePrevious from 'react-use/lib/usePrevious';

import {
  DEFAULT_INDEX_KEY,
  DEFAULT_THREAT_INDEX_KEY,
  DEFAULT_THREAT_MATCH_QUERY,
} from '../../../../../common/constants';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import { EqlOptionsSelected, FieldsEqlOptions } from '../../../../../common/search_strategy';
import { filterRuleFieldsForType } from '../../../pages/detection_engine/rules/create/helpers';
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
import {
  isEqlRule,
  isThreatMatchRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';
import { EqlQueryBar } from '../eql_query_bar';
import { ThreatMatchInput } from '../threatmatch_input';
import { BrowserField, BrowserFields, useFetchIndex } from '../../../../common/containers/source';
import { RulePreview } from '../rule_preview';
import { getIsRulePreviewDisabled } from '../rule_preview/helpers';

const CommonUseField = getUseField({ component: Field });

interface StepDefineRuleProps extends RuleStepProps {
  defaultValues?: DefineStepRule;
}

export const stepDefineDefaultValue: DefineStepRule = {
  anomalyThreshold: 50,
  index: [],
  machineLearningJobId: [],
  ruleType: 'query',
  threatIndex: [],
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  threatQueryBar: {
    query: { query: DEFAULT_THREAT_MATCH_QUERY, language: 'kuery' },
    filters: [],
    saved_id: null,
  },
  requiredFields: [],
  relatedIntegrations: [],
  threatMapping: [],
  threshold: {
    field: [],
    value: '200',
    cardinality: {
      field: [],
      value: '',
    },
  },
  timeline: {
    id: null,
    title: DEFAULT_TIMELINE_TITLE,
  },
  eqlOptions: {},
};

/**
 * This default query will be used for threat query/indicator matches
 * as the default when the user swaps to using it by changing their
 * rule type from any rule type to the "threatMatchRule" type. Only
 * difference is that "*:*" is used instead of '' for its query.
 */
const threatQueryBarDefaultValue: DefineStepRule['queryBar'] = {
  ...stepDefineDefaultValue.queryBar,
  query: { ...stepDefineDefaultValue.queryBar.query, query: '*:*' },
};

const defaultCustomQuery = {
  forNormalRules: stepDefineDefaultValue.queryBar,
  forThreatMatchRules: threatQueryBarDefaultValue,
};

export const MyLabelButton = styled(EuiButtonEmpty)`
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
  const [threatIndexModified, setThreatIndexModified] = useState(false);
  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [threatIndicesConfig] = useUiSetting$<string[]>(DEFAULT_THREAT_INDEX_KEY);
  const initialState = defaultValues ?? {
    ...stepDefineDefaultValue,
    index: indicesConfig,
    threatIndex: threatIndicesConfig,
  };
  const { form } = useForm<DefineStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, getFormData, reset, submit } = form;
  const [
    {
      index: formIndex,
      ruleType: formRuleType,
      queryBar: formQuery,
      threatIndex: formThreatIndex,
      threatQueryBar: formThreatQuery,
      threshold: formThreshold,
      threatMapping: formThreatMapping,
      machineLearningJobId: formMachineLearningJobId,
      anomalyThreshold: formAnomalyThreshold,
    },
  ] = useFormData<DefineStepRule>({
    form,
    watch: [
      'index',
      'ruleType',
      'queryBar',
      'threshold',
      'threshold.field',
      'threshold.value',
      'threshold.cardinality.field',
      'threshold.cardinality.value',
      'threatIndex',
      'threatMapping',
      'machineLearningJobId',
      'anomalyThreshold',
    ],
  });

  const [isQueryBarValid, setIsQueryBarValid] = useState(false);
  const [isThreatQueryBarValid, setIsThreatQueryBarValid] = useState(false);
  const index = formIndex || initialState.index;
  const threatIndex = formThreatIndex || initialState.threatIndex;
  const machineLearningJobId = formMachineLearningJobId ?? initialState.machineLearningJobId;
  const anomalyThreshold = formAnomalyThreshold ?? initialState.anomalyThreshold;
  const ruleType = formRuleType || initialState.ruleType;
  const previousRuleType = usePrevious(ruleType);
  const [indexPatternsLoading, { browserFields, indexPatterns }] = useFetchIndex(index);
  const fields: Readonly<BrowserFields> = aggregatableFields(browserFields);
  const [optionsSelected, setOptionsSelected] = useState<EqlOptionsSelected>(
    defaultValues?.eqlOptions || {}
  );

  const [
    threatIndexPatternsLoading,
    { browserFields: threatBrowserFields, indexPatterns: threatIndexPatterns },
  ] = useFetchIndex(threatIndex);

  // reset form when rule type changes
  useEffect(() => {
    reset({ resetValues: false });
  }, [reset, ruleType]);

  useEffect(() => {
    setIndexModified(!isEqual(index, indicesConfig));
  }, [index, indicesConfig]);

  useEffect(() => {
    setThreatIndexModified(!isEqual(threatIndex, threatIndicesConfig));
  }, [threatIndex, threatIndicesConfig]);

  /**
   * When the user changes rule type to or from "threat_match" this will modify the
   * default "Custom query" string to either:
   *   * from '' to '*:*' if the type is switched to "threat_match"
   *   * from '*:*' back to '' if the type is switched back from "threat_match" to another one
   */
  useEffect(() => {
    const { queryBar } = getFields();
    if (queryBar == null) {
      return;
    }

    // NOTE: Below this code does two things that are worth commenting.

    // 1. If the user enters some text in the "Custom query" form field, we want
    // to keep it even if the user switched to another rule type. So we want to
    // be able to figure out if the field has been modified.
    // - The forms library provides properties (isPristine, isModified, isDirty)
    //   for that but they can't be used in our case: their values can be reset
    //   if you go to step 2 and then back to step 1 or the form is reset in another way.
    // - That's why we compare the actual value of the field with default ones.
    //   NOTE: It's important to do a deep object comparison by value.
    //   Don't do it by reference because the forms lib can change it internally.

    // 2. We call queryBar.reset() in both cases to not trigger validation errors
    // as the user has not entered data into those areas yet.

    // If the user switched rule type to "threat_match" from any other one,
    // but hasn't changed the custom query used for normal rules (''),
    // we reset the custom query to the default used for "threat_match" rules ('*:*').
    if (isThreatMatchRule(ruleType) && !isThreatMatchRule(previousRuleType)) {
      if (isEqual(queryBar.value, defaultCustomQuery.forNormalRules)) {
        queryBar.reset({
          defaultValue: defaultCustomQuery.forThreatMatchRules,
        });
        return;
      }
    }

    // If the user switched rule type from "threat_match" to any other one,
    // but hasn't changed the custom query used for "threat_match" rules ('*:*'),
    // we reset the custom query to another default value ('').
    if (!isThreatMatchRule(ruleType) && isThreatMatchRule(previousRuleType)) {
      if (isEqual(queryBar.value, defaultCustomQuery.forThreatMatchRules)) {
        queryBar.reset({
          defaultValue: defaultCustomQuery.forNormalRules,
        });
      }
    }
  }, [ruleType, previousRuleType, getFields]);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

  const getData = useCallback(async () => {
    const result = await submit();
    result.data = {
      ...result.data,
      eqlOptions: optionsSelected,
    };
    return result.isValid
      ? result
      : {
          isValid: false,
          data: {
            ...getFormData(),
            eqlOptions: optionsSelected,
          },
        };
  }, [getFormData, optionsSelected, submit]);

  useEffect(() => {
    let didCancel = false;
    if (setForm && !didCancel) {
      setForm(RuleStep.defineRule, getData);
    }
    return () => {
      didCancel = true;
    };
  }, [getData, setForm]);

  const handleResetIndices = useCallback(() => {
    const indexField = getFields().index;
    indexField.setValue(indicesConfig);
  }, [getFields, indicesConfig]);

  const handleResetThreatIndices = useCallback(() => {
    const threatIndexField = getFields().threatIndex;
    threatIndexField.setValue(threatIndicesConfig);
  }, [getFields, threatIndicesConfig]);

  const handleOpenTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(true);
  }, []);

  const handleCloseTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(false);
  }, []);

  const ThresholdInputChildren = useCallback(
    ({ thresholdField, thresholdValue, thresholdCardinalityField, thresholdCardinalityValue }) => (
      <ThresholdInput
        browserFields={fields}
        thresholdField={thresholdField}
        thresholdValue={thresholdValue}
        thresholdCardinalityField={thresholdCardinalityField}
        thresholdCardinalityValue={thresholdCardinalityValue}
      />
    ),
    [fields]
  );

  const ThreatMatchInputChildren = useCallback(
    ({ threatMapping }) => (
      <ThreatMatchInput
        handleResetThreatIndices={handleResetThreatIndices}
        indexPatterns={indexPatterns}
        threatBrowserFields={threatBrowserFields}
        threatIndexModified={threatIndexModified}
        threatIndexPatterns={threatIndexPatterns}
        threatIndexPatternsLoading={threatIndexPatternsLoading}
        threatMapping={threatMapping}
        onValidityChange={setIsThreatQueryBarValid}
      />
    ),
    [
      handleResetThreatIndices,
      indexPatterns,
      threatBrowserFields,
      threatIndexModified,
      threatIndexPatterns,
      threatIndexPatternsLoading,
    ]
  );

  const onOptionsChange = useCallback((field: FieldsEqlOptions, value: string | undefined) => {
    setOptionsSelected((prevOptions) => ({
      ...prevOptions,
      [field]: value,
    }));
  }, []);

  const optionsData = useMemo(
    () =>
      isEmpty(indexPatterns.fields)
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: (indexPatterns.fields as FieldSpec[])
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: indexPatterns.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: indexPatterns.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
    [indexPatterns]
  );

  return isReadOnlyView ? (
    <StepContentWrapper data-test-subj="definitionRule" addPadding={addPadding}>
      <StepRuleDescription
        columns={descriptionColumns}
        indexPatterns={indexPatterns}
        schema={filterRuleFieldsForType(schema, ruleType)}
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
              isUpdateView,
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
                    optionsData,
                    optionsSelected,
                    isSizeOptionDisabled: true,
                    onOptionsChange,
                    onValidityChange: setIsQueryBarValid,
                    idAria: 'detectionEngineStepDefineRuleEqlQueryBar',
                    isDisabled: isLoading,
                    isLoading: indexPatternsLoading,
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
                    onValidityChange: setIsQueryBarValid,
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
                  thresholdCardinalityField: {
                    path: 'threshold.cardinality.field',
                  },
                  thresholdCardinalityValue: {
                    path: 'threshold.cardinality.value',
                  },
                }}
              >
                {ThresholdInputChildren}
              </UseMultiFields>
            </>
          </RuleTypeEuiFormRow>
          <RuleTypeEuiFormRow
            $isVisible={isThreatMatchRule(ruleType)}
            data-test-subj="threatMatchInput"
            fullWidth
          >
            <>
              <UseMultiFields
                fields={{
                  threatMapping: {
                    path: 'threatMapping',
                  },
                }}
              >
                {ThreatMatchInputChildren}
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
        <EuiSpacer size="s" />
        <RulePreview
          index={index}
          isDisabled={getIsRulePreviewDisabled({
            ruleType,
            isQueryBarValid,
            isThreatQueryBarValid,
            index,
            threatIndex,
            threatMapping: formThreatMapping,
            machineLearningJobId,
            queryBar: formQuery ?? initialState.queryBar,
          })}
          query={formQuery}
          ruleType={ruleType}
          threatIndex={threatIndex}
          threatQuery={formThreatQuery}
          threatMapping={formThreatMapping}
          threshold={formThreshold}
          machineLearningJobId={machineLearningJobId}
          anomalyThreshold={anomalyThreshold}
          eqlOptions={optionsSelected}
        />
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="define-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepDefineRule = memo(StepDefineRuleComponent);

export function aggregatableFields(browserFields: BrowserFields): BrowserFields {
  const result: Record<string, Partial<BrowserField>> = {};
  for (const [groupName, groupValue] of Object.entries(browserFields)) {
    const fields: Record<string, Partial<BrowserField>> = {};
    if (groupValue.fields) {
      for (const [fieldName, fieldValue] of Object.entries(groupValue.fields)) {
        if (fieldValue.aggregatable === true) {
          fields[fieldName] = fieldValue;
        }
      }
    }
    result[groupName] = {
      fields,
    };
  }
  return result;
}
