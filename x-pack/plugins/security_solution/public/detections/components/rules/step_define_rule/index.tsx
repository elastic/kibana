/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFormRow, EuiSpacer } from '@elastic/eui';
import React, { FC, memo, useCallback, useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import isEqual from 'lodash/isEqual';

import { IndexPattern } from 'src/plugins/data/public';
import { DEFAULT_INDEX_KEY } from '../../../../../common/constants';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useUiSetting$ } from '../../../../common/lib/kibana';
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
import { useFetchIndex } from '../../../../common/containers/source';
import { PreviewQuery, Threshold } from '../query_preview';

const CommonUseField = getUseField({ component: Field });

interface StepDefineRuleProps extends RuleStepProps {
  defaultValues?: DefineStepRule;
}

const stepDefineDefaultValue: DefineStepRule = {
  anomalyThreshold: 50,
  index: [],
  machineLearningJobId: '',
  ruleType: 'query',
  threatIndex: [],
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: undefined,
  },
  threatQueryBar: {
    query: { query: '*:*', language: 'kuery' },
    filters: [],
    saved_id: undefined,
  },
  threatMapping: [],
  threshold: {
    field: [],
    value: '200',
  },
  timeline: {
    id: null,
    title: DEFAULT_TIMELINE_TITLE,
  },
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
  const [
    {
      index: formIndex,
      ruleType: formRuleType,
      queryBar: formQuery,
      threatIndex: formThreatIndex,
      'threshold.value': formThresholdValue,
      'threshold.field': formThresholdField,
    },
  ] = useFormData<
    DefineStepRule & {
      'threshold.value': number | undefined;
      'threshold.field': string[] | undefined;
    }
  >({
    form,
    watch: ['index', 'ruleType', 'queryBar', 'threshold.value', 'threshold.field', 'threatIndex'],
  });
  const [isQueryBarValid, setIsQueryBarValid] = useState(false);
  const index = formIndex || initialState.index;
  const threatIndex = formThreatIndex || initialState.threatIndex;
  const ruleType = formRuleType || initialState.ruleType;
  const queryBarQuery =
    formQuery != null ? formQuery.query.query : '' || initialState.queryBar.query.query;
  const [indexPatternsLoading, { browserFields, indexPatterns }] = useFetchIndex(index);
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

  /**
   * When a rule type is changed to or from a threat match this will modify the
   * default query string to either:
   *   * from the empty string '' to '*:*' if the rule type is "threatMatchRule"
   *   * from '*:*' back to the empty string '' if the rule type is not "threatMatchRule"
   * This calls queryBar.reset() in both cases to not trigger validation errors as
   * the user has not entered data into those areas yet.
   * If the user has entered data then through reference compares we can detect reliably if
   * the user has changed data.
   *   * queryBar.value === defaultQueryBar (Has the user changed the input of '' yet?)
   *   * queryBar.value === threatQueryBarDefaultValue (Has the user changed the input of '*:*' yet?)
   * This is a stronger guarantee than "isPristine" off of the forms as that value can be reset
   * if you go to step 2) and then back to step 2) or the form is reset in another way. Using
   * the reference compare we know factually if the data is changed as the references must change
   * in the form libraries form the initial defaults.
   */
  useEffect(() => {
    const { queryBar } = getFields();
    if (queryBar != null) {
      const { queryBar: defaultQueryBar } = stepDefineDefaultValue;
      if (isThreatMatchRule(ruleType) && queryBar.value === defaultQueryBar) {
        queryBar.reset({
          defaultValue: threatQueryBarDefaultValue,
        });
      } else if (queryBar.value === threatQueryBarDefaultValue) {
        queryBar.reset({
          defaultValue: defaultQueryBar,
        });
      }
    }
  }, [ruleType, getFields]);

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

  const getData = useCallback(async () => {
    const result = await submit();
    return result.isValid
      ? result
      : {
          isValid: false,
          data: getFormData(),
        };
  }, [getFormData, submit]);

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

  const handleOpenTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(true);
  }, []);

  const handleCloseTimelineSearch = useCallback(() => {
    setOpenTimelineSearch(false);
  }, []);

  const thresholdFormValue = useMemo((): Threshold | undefined => {
    return formThresholdValue != null && formThresholdField != null
      ? { value: formThresholdValue, field: formThresholdField[0] }
      : undefined;
  }, [formThresholdField, formThresholdValue]);

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

  const ThreatMatchInputChildren = useCallback(
    ({ threatMapping }) => (
      <ThreatMatchInput
        threatBrowserFields={threatBrowserFields}
        indexPatterns={indexPatterns as IndexPattern}
        threatIndexPatterns={threatIndexPatterns as IndexPattern}
        threatMapping={threatMapping}
        threatIndexPatternsLoading={threatIndexPatternsLoading}
      />
    ),
    [threatBrowserFields, threatIndexPatternsLoading, threatIndexPatterns, indexPatterns]
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
        {ruleType !== 'machine_learning' && ruleType !== 'threat_match' && (
          <>
            <EuiSpacer size="s" />
            <PreviewQuery
              dataTestSubj="ruleCreationQueryPreview"
              idAria="ruleCreationQueryPreview"
              ruleType={ruleType}
              index={index}
              query={formQuery}
              isDisabled={queryBarQuery.trim() === '' || !isQueryBarValid || index.length === 0}
              threshold={thresholdFormValue}
            />
          </>
        )}
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="define-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepDefineRule = memo(StepDefineRuleComponent);
