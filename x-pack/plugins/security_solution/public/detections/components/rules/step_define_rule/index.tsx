/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiRadioGroup,
} from '@elastic/eui';
import React, { FC, memo, useCallback, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import styled from 'styled-components';
import { isEqual } from 'lodash';

import {
  DEFAULT_INDEX_KEY,
  DEFAULT_THREAT_INDEX_KEY,
  DEFAULT_THREAT_MATCH_QUERY,
} from '../../../../../common/constants';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { getScopeFromPath, useSourcererDataView } from '../../../../common/containers/sourcerer';
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
  FIELD_TYPES,
} from '../../../../shared_imports';
import { schema } from './schema';
import * as i18n from './translations';
import {
  isEqlRule,
  isThreatMatchRule,
  isThresholdRule,
} from '../../../../../common/detection_engine/utils';
import { EqlQueryBar } from '../eql_query_bar';
import { DataViewSelector } from '../data_view_selector';
import { ThreatMatchInput } from '../threatmatch_input';
import { BrowserField, BrowserFields, useFetchIndex } from '../../../../common/containers/source';
import { RulePreview } from '../rule_preview';
import { getIsRulePreviewDisabled } from '../rule_preview/helpers';
import { Sourcerer } from '../../../../common/components/sourcerer';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import {
  sourcererActions,
  sourcererModel,
  sourcererSelectors,
} from '../../../../common/store/sourcerer';
import { usePickIndexPatterns } from '../../../../common/components/sourcerer/use_pick_index_patterns';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

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
  dataViewId: 'security-solution-default',
  queryBar: {
    query: { query: '', language: 'kuery' },
    filters: [],
    saved_id: undefined,
  },
  threatQueryBar: {
    query: { query: DEFAULT_THREAT_MATCH_QUERY, language: 'kuery' },
    filters: [],
    saved_id: undefined,
  },
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
  const dataViewRadioButtonId = 'dataView';
  const { pathname } = useLocation();
  const sourcererPathName = getScopeFromPath(pathname);

  const {
    // browserFields,
    // docValueFields,
    indexPattern: dataViewIndexPattern,
    runtimeMappings,
    // selectedPatterns,
    dataViewId: sourcererDataViewId,
    loading: isLoadingDataViewIndexPattern,
  } = useSourcererDataView(sourcererPathName);
  // // console.log('SELECTED PATTERNS', selectedPatterns);
  // console.log('INDEX PATTERN', indexPattern);
  // console.log('RUNTIME MAPPINGS', JSON.stringify(runtimeMappings, null, 2));
  // // console.log('DATA VIEW ID', selectedDataViewId);
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const {
    defaultDataView,
    kibanaDataViews,
    signalIndexName,
    sourcererScope: {
      selectedDataViewId,
      selectedPatterns,
      missingPatterns: sourcererMissingPatterns,
    },
  } = useDeepEqualSelector((state) => sourcererScopeSelector(state, sourcererPathName));

  // console.log('ALL OPTIONS', kibanaDataViews);
  const mlCapabilities = useMlCapabilities();
  const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
  const [indexModified, setIndexModified] = useState(false);
  const [threatIndexModified, setThreatIndexModified] = useState(false);
  const [radioIdSelected, setRadioIdSelected] = useState(dataViewRadioButtonId);

  const [indicesConfig] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const [threatIndicesConfig] = useUiSetting$<string[]>(DEFAULT_THREAT_INDEX_KEY);
  const initialState = defaultValues ?? {
    ...stepDefineDefaultValue,
    index: indicesConfig,
    threatIndex: threatIndicesConfig,
    dataViewId: selectedDataViewId,
  };
  // console.error('initial state', JSON.stringify(initialState, null, 2));
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
      dataViewId: formDataViewId,
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
      'dataViewId',
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
  const dataViewId = formDataViewId || initialState.dataViewId;
  const threatIndex = formThreatIndex || initialState.threatIndex;
  const machineLearningJobId = formMachineLearningJobId ?? initialState.machineLearningJobId;
  const anomalyThreshold = formAnomalyThreshold ?? initialState.anomalyThreshold;
  const ruleType = formRuleType || initialState.ruleType;
  // TODO: update the logic for browserField stuff.
  // if 'index' is selected, use these browser fields
  // otherwise use the dataview browserfields
  const [indexPatternsLoading, { browserFields, indexPatterns: indexIndexPatterns }] =
    useFetchIndex(index);

  const [indexPattern, setIndexPattern] = useState(dataViewIndexPattern);

  const onChangeRadioButton = (optionId: string) => {
    setRadioIdSelected(optionId);
  };

  useEffect(() => {
    if (radioIdSelected === dataViewRadioButtonId) {
      setIndexPattern(dataViewIndexPattern);
    } else {
      // elasticsearch index patterns
      // @ts-expect-error Type 'DataViewFieldBase' is missing the following properties from type 'FieldSpec': searchable, aggregatablets(2345)
      setIndexPattern(indexIndexPatterns);
    }
  }, [indexIndexPatterns, dataViewIndexPattern, radioIdSelected]);
  const fields: Readonly<BrowserFields> = aggregatableFields(browserFields);

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
   * if you go to step 2) and then back to step 1) or the form is reset in another way. Using
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

  // console.error('FORM DATA', JSON.stringify(getFormData(), null, 2));

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
  const SourcererFlex = styled(EuiFlexItem)`
    align-items: flex-end;
  `;

  SourcererFlex.displayName = 'SourcererFlex';

  const ThreatMatchInputChildren = useCallback(
    ({ threatMapping }) => (
      <ThreatMatchInput
        handleResetThreatIndices={handleResetThreatIndices}
        indexPatterns={indexPattern}
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
      indexPattern,
      threatBrowserFields,
      threatIndexModified,
      threatIndexPatterns,
      threatIndexPatternsLoading,
    ]
  );
  const DataSource = useMemo(() => {
    if (radioIdSelected === dataViewRadioButtonId) {
      return (
        <UseField
          path="dataViewId"
          component={DataViewSelector}
          componentProps={{
            kibanaDataViews,
            dataViewId,
          }}
        />
      );
    } else {
      return (
        <EuiAccordion
          data-test-subj="indexPatternsAccordion"
          id="indexPatternsAccoridion"
          buttonContent={i18n.INDEX_PATTERNS}
        >
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
        </EuiAccordion>
      );
    }
  }, [handleResetIndices, indexModified, kibanaDataViews, radioIdSelected, dataViewId]);
  return isReadOnlyView ? (
    <StepContentWrapper data-test-subj="definitionRule" addPadding={addPadding}>
      <StepRuleDescription
        columns={descriptionColumns}
        indexPatterns={indexPattern}
        schema={filterRuleFieldsForType(schema, ruleType)}
        data={filterRuleFieldsForType(initialState, ruleType)}
      />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <SourcererFlex grow={1}>
          <Sourcerer scope={SourcererScopeName.timeline} />
        </SourcererFlex>
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
              <EuiFlexGroup>
                <EuiFlexItem grow={1}>
                  {/* <UseField
                    path="dataViewId"
                    component={DataViewSelector}
                    componentProps={{
                      kibanaDataViews,
                    }}
                  /> */}
                  <EuiRadioGroup
                    options={[
                      {
                        id: dataViewRadioButtonId,
                        label: 'Data View',
                        // labelProps: {
                        //   style: { display: 'flex !important', width: '400px' },
                        // },
                      },
                    ]}
                    idSelected={radioIdSelected}
                    onChange={onChangeRadioButton}
                    name="radio group"
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={1}>
                  <EuiRadioGroup
                    options={[
                      {
                        id: 'indexPatterns',
                        label: 'Index Patterns',
                      },
                    ]}
                    idSelected={radioIdSelected}
                    onChange={onChangeRadioButton}
                    name="radio group"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              {DataSource}
              <EuiSpacer size="s" />
              {isEqlRule(ruleType) ? (
                <UseField
                  key="EqlQueryBar"
                  path="queryBar"
                  component={EqlQueryBar}
                  componentProps={{
                    onValidityChange: setIsQueryBarValid,
                    idAria: 'detectionEngineStepDefineRuleEqlQueryBar',
                    isDisabled: isLoading,
                    isLoading: isLoadingDataViewIndexPattern,
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
                    // docValueFields,
                    // runtimeMappings,
                    idAria: 'detectionEngineStepDefineRuleQueryBar',
                    indexPattern,
                    isDisabled: isLoading,
                    isLoading: isLoadingDataViewIndexPattern,
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
          dataViewId={dataViewId}
          isDisabled={getIsRulePreviewDisabled({
            ruleType,
            isQueryBarValid,
            isThreatQueryBarValid,
            index,
            dataViewId,
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
