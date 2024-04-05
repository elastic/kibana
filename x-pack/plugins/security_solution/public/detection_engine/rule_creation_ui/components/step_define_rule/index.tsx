/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiButtonGroup,
  EuiText,
  EuiRadioGroup,
  EuiToolTip,
} from '@elastic/eui';
import type { FC } from 'react';
import React, { memo, useCallback, useState, useEffect, useMemo, useRef } from 'react';

import styled from 'styled-components';
import { i18n as i18nCore } from '@kbn/i18n';
import { isEqual, isEmpty, omit } from 'lodash';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import usePrevious from 'react-use/lib/usePrevious';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import type { SavedQuery } from '@kbn/data-plugin/public';
import type { DataViewBase } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSetFieldValueWithCallback } from '../../../../common/utils/use_set_field_value_cb';
import { useRuleFromTimeline } from '../../../../detections/containers/detection_engine/rules/use_rule_from_timeline';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import type { EqlOptionsSelected, FieldsEqlOptions } from '../../../../../common/search_strategy';
import { filterRuleFieldsForType, getStepDataDataSource } from '../../pages/rule_creation/helpers';
import type {
  DefineStepRule,
  RuleStepProps,
} from '../../../../detections/pages/detection_engine/rules/types';
import {
  DataSourceType,
  GroupByOptions,
} from '../../../../detections/pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import type { QueryBarDefineRuleProps } from '../query_bar';
import { QueryBarDefineRule } from '../query_bar';
import { SelectRuleType } from '../select_rule_type';
import { AnomalyThresholdSlider } from '../anomaly_threshold_slider';
import { MlJobSelect } from '../../../rule_creation/components/ml_job_select';
import { PickTimeline } from '../../../rule_creation/components/pick_timeline';
import { StepContentWrapper } from '../../../rule_creation/components/step_content_wrapper';
import { ThresholdInput } from '../threshold_input';
import { SuppressionInfoIcon } from '../suppression_info_icon';
import { EsqlInfoIcon } from '../../../rule_creation/components/esql_info_icon';
import {
  Field,
  Form,
  getUseField,
  HiddenField,
  UseField,
  UseMultiFields,
} from '../../../../shared_imports';
import type { FormHook } from '../../../../shared_imports';
import { schema } from './schema';
import { getTermsAggregationFields } from './utils';
import { useExperimentalFeatureFieldsTransform } from './use_experimental_feature_fields_transform';
import * as i18n from './translations';
import {
  isEqlRule,
  isNewTermsRule,
  isThreatMatchRule,
  isThresholdRule as getIsThresholdRule,
  isQueryRule,
  isEsqlRule,
} from '../../../../../common/detection_engine/utils';
import { EqlQueryBar } from '../eql_query_bar';
import { DataViewSelector } from '../data_view_selector';
import { ThreatMatchInput } from '../threatmatch_input';
import type { BrowserField } from '../../../../common/containers/source';
import { useFetchIndex } from '../../../../common/containers/source';
import { NewTermsFields } from '../new_terms_fields';
import { ScheduleItem } from '../../../rule_creation/components/schedule_item_form';
import { DocLink } from '../../../../common/components/links_to_docs/doc_link';
import { defaultCustomQuery } from '../../../../detections/pages/detection_engine/rules/utils';
import { MultiSelectFieldsAutocomplete } from '../multi_select_fields';
import { useLicense } from '../../../../common/hooks/use_license';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../common/api/detection_engine/model/rule_schema';
import { DurationInput } from '../duration_input';
import { MINIMUM_LICENSE_FOR_SUPPRESSION } from '../../../../../common/detection_engine/constants';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';
import { useAlertSuppression } from '../../../rule_management/logic/use_alert_suppression';

const CommonUseField = getUseField({ component: Field });

const StyledVisibleContainer = styled.div<{ isVisible: boolean }>`
  display: ${(props) => (props.isVisible ? 'block' : 'none')};
`;
interface StepDefineRuleProps extends RuleStepProps {
  indicesConfig: string[];
  threatIndicesConfig: string[];
  defaultSavedQuery?: SavedQuery;
  form: FormHook<DefineStepRule>;
  optionsSelected: EqlOptionsSelected;
  setOptionsSelected: React.Dispatch<React.SetStateAction<EqlOptionsSelected>>;
  indexPattern: DataViewBase;
  isIndexPatternLoading: boolean;
  browserFields: BrowserFields;
  isQueryBarValid: boolean;
  setIsQueryBarValid: (valid: boolean) => void;
  setIsThreatQueryBarValid: (valid: boolean) => void;
  ruleType: Type;
  index: string[];
  threatIndex: string[];
  groupByFields: string[];
  dataSourceType: DataSourceType;
  shouldLoadQueryDynamically: boolean;
  queryBarTitle: string | undefined;
  queryBarSavedId: string | null | undefined;
  thresholdFields: string[] | undefined;
  enableThresholdSuppression: boolean;
}

interface StepDefineRuleReadOnlyProps {
  addPadding: boolean;
  descriptionColumns: 'multi' | 'single' | 'singleSplit';
  defaultValues: DefineStepRule;
  indexPattern: DataViewBase;
}

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

const IntendedRuleTypeEuiFormRow = styled(RuleTypeEuiFormRow)`
  ${({ theme }) => `padding-left: ${theme.eui.euiSizeXL};`}
`;

const StepDefineRuleComponent: FC<StepDefineRuleProps> = ({
  isLoading,
  isUpdateView = false,
  kibanaDataViews,
  indicesConfig,
  threatIndicesConfig,
  defaultSavedQuery,
  form,
  optionsSelected,
  setOptionsSelected,
  indexPattern,
  isIndexPatternLoading,
  browserFields,
  isQueryBarValid,
  setIsQueryBarValid,
  setIsThreatQueryBarValid,
  ruleType,
  index,
  threatIndex,
  groupByFields,
  dataSourceType,
  shouldLoadQueryDynamically,
  queryBarTitle,
  queryBarSavedId,
  thresholdFields,
  enableThresholdSuppression,
}) => {
  const { isSuppressionEnabled: isAlertSuppressionEnabled } = useAlertSuppression(ruleType);
  const mlCapabilities = useMlCapabilities();
  const [openTimelineSearch, setOpenTimelineSearch] = useState(false);
  const [indexModified, setIndexModified] = useState(false);
  const [threatIndexModified, setThreatIndexModified] = useState(false);
  const [eqlSequenceQueryInUse, setEqlSequenceQueryInUse] = useState(false);
  const [isEqlSequenceSuppressionFilled, setIsEqlSequenceSuppressionFilled] = useState(false);

  const license = useLicense();

  const esqlQueryRef = useRef<DefineStepRule['queryBar'] | undefined>(undefined);

  const isAlertSuppressionLicenseValid = license.isAtLeast(MINIMUM_LICENSE_FOR_SUPPRESSION);

  const isThresholdRule = getIsThresholdRule(ruleType);
  const alertSuppressionUpsellingMessage = useUpsellingMessage('alert_suppression_rule_form');

  const { getFields, reset, setFieldValue } = form;

  const setRuleTypeCallback = useSetFieldValueWithCallback({
    field: 'ruleType',
    value: ruleType,
    setFieldValue,
  });

  const handleSetRuleFromTimeline = useCallback(
    ({ index: timelineIndex, queryBar: timelineQueryBar, eqlOptions }) => {
      const setQuery = () => {
        setFieldValue('index', timelineIndex);
        setFieldValue('queryBar', timelineQueryBar);
      };
      if (timelineQueryBar.query.language === 'eql') {
        setRuleTypeCallback('eql', setQuery);
        setOptionsSelected((prevOptions) => ({
          ...prevOptions,
          ...(eqlOptions != null ? eqlOptions : {}),
        }));
      } else {
        setQuery();
      }
    },
    [setFieldValue, setRuleTypeCallback, setOptionsSelected]
  );

  const { onOpenTimeline, loading: timelineQueryLoading } =
    useRuleFromTimeline(handleSetRuleFromTimeline);

  // if 'index' is selected, use these browser fields
  // otherwise use the dataview browserfields
  const previousRuleType = usePrevious(ruleType);

  // Callback for when user toggles between Data Views and Index Patterns
  const onChangeDataSource = useCallback(
    (optionId: string) => {
      form.setFieldValue('dataSourceType', optionId);
      form.getFields().index.reset({
        resetValue: false,
      });
      form.getFields().dataViewId.reset({
        resetValue: false,
      });
    },
    [form]
  );

  const [aggFields, setAggregatableFields] = useState<BrowserField[]>([]);

  useEffect(() => {
    const { fields } = indexPattern;
    /**
     * Typecasting to BrowserField because fields is
     * typed as DataViewFieldBase[] which does not have
     * the 'aggregatable' property, however the type is incorrect
     *
     * fields does contain elements with the aggregatable property.
     * We will need to determine where these types are defined and
     * figure out where the discrepency is.
     */
    setAggregatableFields(aggregatableFields(fields as BrowserField[]));
  }, [indexPattern]);

  const termsAggregationFields: BrowserField[] = useMemo(
    () => getTermsAggregationFields(aggFields),
    [aggFields]
  );

  const [
    threatIndexPatternsLoading,
    { browserFields: threatBrowserFields, indexPatterns: threatIndexPatterns },
  ] = useFetchIndex(threatIndex);

  // reset form when rule type changes
  useEffect(() => {
    reset({ resetValues: false });
    setEqlSequenceQueryInUse(false);
    setIsEqlSequenceSuppressionFilled(false);
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
    const { queryBar: currentQuery } = getFields();
    if (currentQuery == null) {
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

    // 2. We call currentQuery.reset() in both cases to not trigger validation errors
    // as the user has not entered data into those areas yet.

    // If the user switched rule type to "threat_match" from any other one,
    // but hasn't changed the custom query used for normal rules (''),
    // we reset the custom query to the default used for "threat_match" rules ('*:*').
    if (isThreatMatchRule(ruleType) && !isThreatMatchRule(previousRuleType)) {
      if (isEqual(currentQuery.value, defaultCustomQuery.forNormalRules)) {
        currentQuery.reset({
          defaultValue: defaultCustomQuery.forThreatMatchRules,
        });
        return;
      }
    }

    // If the user switched rule type from "threat_match" to any other one,
    // but hasn't changed the custom query used for "threat_match" rules ('*:*'),
    // we reset the custom query to another default value ('').
    if (!isThreatMatchRule(ruleType) && isThreatMatchRule(previousRuleType)) {
      if (isEqual(currentQuery.value, defaultCustomQuery.forThreatMatchRules)) {
        currentQuery.reset({
          defaultValue: defaultCustomQuery.forNormalRules,
        });
      }
    }
  }, [ruleType, previousRuleType, getFields]);

  /**
   * ensures when user switches between rule types, written ES|QL query is not getting lost
   * additional work is required in this code area, as currently switching to EQL will result in query lose
   * https://github.com/elastic/kibana/issues/166933
   */
  useEffect(() => {
    const { queryBar: currentQuery } = getFields();
    if (currentQuery == null) {
      return;
    }

    const currentQueryValue = currentQuery.value as DefineStepRule['queryBar'];

    // sets ES|QL query to a default value or earlier added one, when switching to ES|QL rule type
    if (isEsqlRule(ruleType)) {
      if (previousRuleType && !isEsqlRule(previousRuleType)) {
        currentQuery.reset({
          defaultValue: esqlQueryRef.current ?? defaultCustomQuery.forEsqlRules,
        });
      }
      // otherwise reset it to default values of other rule types
    } else if (isEsqlRule(previousRuleType)) {
      // sets ES|QL query value to reference, so it can be used when user switch back from one rule type to another
      if (currentQueryValue?.query?.language === 'esql') {
        esqlQueryRef.current = currentQueryValue;
      }

      const defaultValue = isThreatMatchRule(ruleType)
        ? defaultCustomQuery.forThreatMatchRules
        : defaultCustomQuery.forNormalRules;

      currentQuery.reset({
        defaultValue,
      });
    }
  }, [ruleType, previousRuleType, getFields]);

  /**
   * for threshold rule suppression only time interval suppression mode is available
   */
  useEffect(() => {
    if (isThresholdRule) {
      form.setFieldValue('groupByRadioSelection', GroupByOptions.PerTimePeriod);
    }
  }, [isThresholdRule, form]);

  // if saved query failed to load:
  // - reset shouldLoadFormDynamically to false, as non existent query cannot be used for loading and execution
  const handleSavedQueryError = useCallback(() => {
    if (!isQueryBarValid) {
      form.setFieldValue('shouldLoadQueryDynamically', false);
    }
  }, [isQueryBarValid, form]);

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
        browserFields={aggFields}
        thresholdField={thresholdField}
        thresholdValue={thresholdValue}
        thresholdCardinalityField={thresholdCardinalityField}
        thresholdCardinalityValue={thresholdCardinalityValue}
      />
    ),
    [aggFields]
  );

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
      setIsThreatQueryBarValid,
      threatBrowserFields,
      threatIndexModified,
      threatIndexPatterns,
      threatIndexPatternsLoading,
    ]
  );

  useEffect(() => {
    if (isUpdateView && isEqlRule(ruleType)) {
      const { queryBar: currentQuery } = getFields();
      const currentQueryValue = currentQuery.value as DefineStepRule['queryBar'];
      const { query } = currentQueryValue;
      setEqlSequenceQueryInUse(query.query.trim().startsWith('sequence'));
    }
  }, [ruleType, isEqlRule, isUpdateView, setEqlSequenceQueryInUse]);

  const onUsingEqlSequenceQuery = (isSequence: boolean) => {
    setEqlSequenceQueryInUse(isSequence);
  };
  /**
   * Disables the Suppression fields only if the Eql sequence
   * query is used and the suppression fields are in the
   * default state
   */
  const disableSuppressionFieldsForEQLSequence =
    eqlSequenceQueryInUse && !isEqlSequenceSuppressionFilled;

  /**
   * Component that allows selection of suppression intervals disabled:
   *  - if suppression license is not valid(i.e. less than platinum)
   *  - or for not threshold rule - when groupBy fields not selected
   * - Eql sequence is used
   */
  const isGroupByChildrenDisabled =
    disableSuppressionFieldsForEQLSequence || !isAlertSuppressionLicenseValid || isThresholdRule
      ? false
      : !groupByFields?.length;

  /**
   * Per rule execution radio option is disabled
   *  - if suppression license is not valid(i.e. less than platinum)
   *  - always disabled for threshold rule
   *  - Eql sequence is used and suppression fields are in the default state
   */
  const isPerRuleExecutionDisabled =
    disableSuppressionFieldsForEQLSequence || !isAlertSuppressionLicenseValid || isThresholdRule;

  /**
   * Per time period execution radio option is disabled
   *  - if suppression license is not valid(i.e. less than platinum)
   *  - disabled for threshold rule when enabled suppression is not checked
   * - Eql sequence is used and suppression fields are in the default state
   */
  const isPerTimePeriodDisabled =
    disableSuppressionFieldsForEQLSequence ||
    !isAlertSuppressionLicenseValid ||
    (isThresholdRule && !enableThresholdSuppression);

  /**
   * Suppression duration is disabled when
   *  - if suppression license is not valid(i.e. less than platinum)
   *  - when suppression by rule execution is selected in radio button
   *  - when threshold suppression is not enabled and no group by fields selected
   * -  Eql sequence is used and suppression fields are in the default state
   * */
  const isDurationDisabled =
    disableSuppressionFieldsForEQLSequence ||
    !isAlertSuppressionLicenseValid ||
    (!enableThresholdSuppression && groupByFields?.length === 0);

  /**
   * Suppression missing fields is disabled when
   *  - if suppression license is not valid(i.e. less than platinum)
   *  - when no group by fields selected
   * -  Eql sequence is used and suppression fields are in the default state
   * */
  const isMissingFieldsDisabled =
    disableSuppressionFieldsForEQLSequence ||
    !isAlertSuppressionLicenseValid ||
    !groupByFields.length;

  useEffect(() => {
    const showInvalidSuppressionConfigurations = !!(eqlSequenceQueryInUse && groupByFields.length);
    setIsEqlSequenceSuppressionFilled(showInvalidSuppressionConfigurations);
    form.validateFields(['groupByFields']);

    form.setFieldErrors(
      'groupByFields',
      showInvalidSuppressionConfigurations
        ? [
            {
              message: i18n.EQL_SEQUENCE_SUPPRESSION_GROUPBY_VALIDATION_TEXT,
            },
          ]
        : []
    );
  }, [eqlSequenceQueryInUse, groupByFields.length, form]);

  const GroupByChildren = useCallback(
    ({ groupByRadioSelection, groupByDurationUnit, groupByDurationValue }) => (
      <EuiRadioGroup
        disabled={isGroupByChildrenDisabled}
        idSelected={groupByRadioSelection.value}
        options={[
          {
            id: GroupByOptions.PerRuleExecution,
            label: (
              <EuiToolTip
                content={
                  isThresholdRule ? i18n.THRESHOLD_SUPPRESSION_PER_RULE_EXECUTION_WARNING : null
                }
              >
                <> {i18n.ALERT_SUPPRESSION_PER_RULE_EXECUTION}</>
              </EuiToolTip>
            ),
            disabled: isPerRuleExecutionDisabled,
          },
          {
            id: GroupByOptions.PerTimePeriod,
            disabled: isPerTimePeriodDisabled,
            label: (
              <>
                {i18n.ALERT_SUPPRESSION_PER_TIME_PERIOD}
                <DurationInput
                  data-test-subj="alertSuppressionDurationInput"
                  durationValueField={groupByDurationValue}
                  durationUnitField={groupByDurationUnit}
                  // Suppression duration is also disabled suppression by rule execution is selected in radio button
                  isDisabled={
                    isDurationDisabled ||
                    groupByRadioSelection.value !== GroupByOptions.PerTimePeriod
                  }
                  minimumValue={1}
                />
              </>
            ),
          },
        ]}
        onChange={(id: string) => {
          groupByRadioSelection.setValue(id);
        }}
        data-test-subj="groupByDurationOptions"
      />
    ),
    [
      isThresholdRule,
      isDurationDisabled,
      isPerTimePeriodDisabled,
      isPerRuleExecutionDisabled,
      isGroupByChildrenDisabled,
    ]
  );

  const AlertSuppressionMissingFields = useCallback(
    ({ suppressionMissingFields }) => (
      <EuiRadioGroup
        disabled={isMissingFieldsDisabled}
        idSelected={suppressionMissingFields.value}
        options={[
          {
            id: AlertSuppressionMissingFieldsStrategyEnum.suppress,
            label: i18n.ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS_OPTION,
          },
          {
            id: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
            label: i18n.ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS_OPTION,
          },
        ]}
        onChange={(id: string) => {
          suppressionMissingFields.setValue(id);
        }}
        data-test-subj="suppressionMissingFieldsOptions"
      />
    ),
    [isMissingFieldsDisabled]
  );

  const dataViewIndexPatternToggleButtonOptions: EuiButtonGroupOptionProps[] = useMemo(
    () => [
      {
        id: DataSourceType.IndexPatterns,
        label: i18nCore.translate(
          'xpack.securitySolution.ruleDefine.indexTypeSelect.indexPattern',
          {
            defaultMessage: 'Index Patterns',
          }
        ),
        iconType: dataSourceType === DataSourceType.IndexPatterns ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.IndexPatterns}`,
      },
      {
        id: DataSourceType.DataView,
        label: i18nCore.translate('xpack.securitySolution.ruleDefine.indexTypeSelect.dataView', {
          defaultMessage: 'Data View',
        }),
        iconType: dataSourceType === DataSourceType.DataView ? 'checkInCircleFilled' : 'empty',
        'data-test-subj': `rule-index-toggle-${DataSourceType.DataView}`,
      },
    ],
    [dataSourceType]
  );

  const DataViewSelectorMemo = useMemo(() => {
    return kibanaDataViews == null || Object.keys(kibanaDataViews).length === 0 ? (
      <EuiLoadingSpinner size="l" />
    ) : (
      <UseField
        key="DataViewSelector"
        path="dataViewId"
        component={DataViewSelector}
        componentProps={{
          kibanaDataViews,
        }}
      />
    );
  }, [kibanaDataViews]);

  const DataSource = useMemo(() => {
    return (
      <RuleTypeEuiFormRow label={i18n.SOURCE} $isVisible={true} fullWidth>
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="dataViewIndexPatternButtonGroupFlexGroup"
        >
          <EuiFlexItem>
            <EuiText size="xs">
              <FormattedMessage
                id="xpack.securitySolution.dataViewSelectorText1"
                defaultMessage="Use Kibana "
              />
              <DocLink guidePath="kibana" docPath="data-views.html" linkText="Data Views" />
              <FormattedMessage
                id="xpack.securitySolution.dataViewSelectorText2"
                defaultMessage=" or specify individual "
              />
              <DocLink
                guidePath="kibana"
                docPath="index-patterns-api-create.html"
                linkText="index patterns"
              />
              <FormattedMessage
                id="xpack.securitySolution.dataViewSelectorText3"
                defaultMessage=" as your rule's data source to be searched."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <RuleTypeEuiFormRow $isVisible={true}>
              <EuiButtonGroup
                isFullWidth={true}
                legend="Rule index pattern or data view selector"
                data-test-subj="dataViewIndexPatternButtonGroup"
                idSelected={dataSourceType}
                onChange={onChangeDataSource}
                options={dataViewIndexPatternToggleButtonOptions}
                color="primary"
              />
            </RuleTypeEuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <StyledVisibleContainer isVisible={dataSourceType === DataSourceType.DataView}>
              {DataViewSelectorMemo}
            </StyledVisibleContainer>
            <StyledVisibleContainer isVisible={dataSourceType === DataSourceType.IndexPatterns}>
              <CommonUseField
                path="index"
                config={{
                  ...omit(schema.index, 'label'),
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
                    isDisabled: timelineQueryLoading,
                    isLoading: timelineQueryLoading,
                  },
                }}
              />
            </StyledVisibleContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
      </RuleTypeEuiFormRow>
    );
  }, [
    timelineQueryLoading,
    dataSourceType,
    onChangeDataSource,
    dataViewIndexPatternToggleButtonOptions,
    DataViewSelectorMemo,
    indexModified,
    handleResetIndices,
  ]);

  const queryBarProps = useMemo(
    () =>
      ({
        idAria: 'detectionEngineStepDefineRuleQueryBar',
        indexPattern,
        isDisabled: isLoading,
        isLoading,
        dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
        onValidityChange: setIsQueryBarValid,
      } as QueryBarDefineRuleProps),
    [indexPattern, isLoading, setIsQueryBarValid]
  );

  const esqlQueryBarConfig = useMemo(
    () => ({
      ...schema.queryBar,
      label: i18n.ESQL_QUERY,
      labelAppend: <EsqlInfoIcon />,
    }),
    []
  );

  const EsqlQueryBarMemo = useMemo(
    () => (
      <UseField
        key="QueryBarDefineRule"
        path="queryBar"
        config={esqlQueryBarConfig}
        component={QueryBarDefineRule}
        componentProps={{
          ...queryBarProps,
          dataTestSubj: 'detectionEngineStepDefineRuleEsqlQueryBar',
          idAria: 'detectionEngineStepDefineRuleEsqlQueryBar',
        }}
      />
    ),
    [queryBarProps, esqlQueryBarConfig]
  );

  const QueryBarMemo = useMemo(
    () => (
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
              disabled={shouldLoadQueryDynamically}
            >
              {i18n.IMPORT_TIMELINE_QUERY}
            </MyLabelButton>
          ),
        }}
        component={QueryBarDefineRule}
        componentProps={
          {
            browserFields,
            idAria: 'detectionEngineStepDefineRuleQueryBar',
            indexPattern,
            isDisabled: isLoading || shouldLoadQueryDynamically || timelineQueryLoading,
            resetToSavedQuery: shouldLoadQueryDynamically,
            isLoading: isIndexPatternLoading || timelineQueryLoading,
            dataTestSubj: 'detectionEngineStepDefineRuleQueryBar',
            openTimelineSearch,
            onValidityChange: setIsQueryBarValid,
            onCloseTimelineSearch: handleCloseTimelineSearch,
            onSavedQueryError: handleSavedQueryError,
            defaultSavedQuery,
            onOpenTimeline,
          } as QueryBarDefineRuleProps
        }
      />
    ),
    [
      handleOpenTimelineSearch,
      shouldLoadQueryDynamically,
      browserFields,
      indexPattern,
      isLoading,
      timelineQueryLoading,
      isIndexPatternLoading,
      openTimelineSearch,
      setIsQueryBarValid,
      handleCloseTimelineSearch,
      handleSavedQueryError,
      defaultSavedQuery,
      onOpenTimeline,
    ]
  );

  const onOptionsChange = useCallback(
    (field: FieldsEqlOptions, value: string | undefined) => {
      setOptionsSelected((prevOptions) => {
        const newOptions = {
          ...prevOptions,
          [field]: value,
        };

        setFieldValue('eqlOptions', newOptions);
        return newOptions;
      });
    },
    [setFieldValue, setOptionsSelected]
  );

  const optionsData = useMemo(
    () =>
      isEmpty(indexPattern.fields)
        ? {
            keywordFields: [],
            dateFields: [],
            nonDateFields: [],
          }
        : {
            keywordFields: (indexPattern.fields as FieldSpec[])
              .filter((f) => f.esTypes?.includes('keyword'))
              .map((f) => ({ label: f.name })),
            dateFields: indexPattern.fields
              .filter((f) => f.type === 'date')
              .map((f) => ({ label: f.name })),
            nonDateFields: indexPattern.fields
              .filter((f) => f.type !== 'date')
              .map((f) => ({ label: f.name })),
          },
    [indexPattern]
  );

  const selectRuleTypeProps = useMemo(
    () => ({
      describedByIds: ['detectionEngineStepDefineRuleType'],
      isUpdateView,
      hasValidLicense: hasMlLicense(mlCapabilities),
      isMlAdmin: hasMlAdminPermissions(mlCapabilities),
    }),
    [isUpdateView, mlCapabilities]
  );

  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepDefineRule">
          <UseField
            path="dataSourceType"
            component={HiddenField}
            componentProps={{
              euiFieldProps: {
                fullWidth: true,
                placeholder: '',
              },
            }}
          />
          <UseField
            path="ruleType"
            component={SelectRuleType}
            componentProps={selectRuleTypeProps}
          />
          <RuleTypeEuiFormRow $isVisible={!isMlRule(ruleType)} fullWidth>
            <>
              <StyledVisibleContainer isVisible={!isEsqlRule(ruleType)}>
                <EuiSpacer size="s" />
                {DataSource}
              </StyledVisibleContainer>
              <EuiSpacer size="s" />
              {isEqlRule(ruleType) ? (
                <>
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
                      isLoading: isIndexPatternLoading,
                      indexPattern,
                      showFilterBar: true,
                      dataTestSubj: 'detectionEngineStepDefineRuleEqlQueryBar',
                      onUsingSequenceQuery: onUsingEqlSequenceQuery,
                    }}
                    config={{
                      ...schema.queryBar,
                      label: i18n.EQL_QUERY_BAR_LABEL,
                    }}
                  />
                  <UseField path="eqlOptions" component={HiddenField} />
                </>
              ) : isEsqlRule(ruleType) ? (
                EsqlQueryBarMemo
              ) : (
                QueryBarMemo
              )}
            </>
          </RuleTypeEuiFormRow>

          {isQueryRule(ruleType) && (
            <>
              <EuiSpacer size="s" />
              <RuleTypeEuiFormRow
                label={i18n.SAVED_QUERY_FORM_ROW_LABEL}
                $isVisible={Boolean(queryBarSavedId)}
                fullWidth
              >
                <CommonUseField
                  path="shouldLoadQueryDynamically"
                  componentProps={{
                    idAria: 'detectionEngineStepDefineRuleShouldLoadQueryDynamically',
                    'data-test-subj': 'detectionEngineStepDefineRuleShouldLoadQueryDynamically',
                    euiFieldProps: {
                      disabled: isLoading,
                      label: queryBarTitle
                        ? i18n.getSavedQueryCheckboxLabel(queryBarTitle)
                        : i18n.getSavedQueryCheckboxLabelWithoutName(),
                    },
                  }}
                />
              </RuleTypeEuiFormRow>
            </>
          )}

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
            $isVisible={isThresholdRule}
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
          <RuleTypeEuiFormRow
            $isVisible={isNewTermsRule(ruleType)}
            data-test-subj="newTermsInput"
            fullWidth
          >
            <>
              <UseField
                path="newTermsFields"
                component={NewTermsFields}
                componentProps={{
                  browserFields: termsAggregationFields,
                }}
              />
              <UseField
                path="historyWindowSize"
                component={ScheduleItem}
                componentProps={{
                  idAria: 'detectionEngineStepDefineRuleHistoryWindowSize',
                  dataTestSubj: 'detectionEngineStepDefineRuleHistoryWindowSize',
                  timeTypes: ['m', 'h', 'd'],
                }}
              />
            </>
          </RuleTypeEuiFormRow>

          <EuiSpacer size="m" />

          <EuiToolTip
            content={
              disableSuppressionFieldsForEQLSequence
                ? i18n.EQL_SEQUENCE_SUPPRESSION_DISABLE_TOOLTIP
                : null
            }
            position="right"
          >
            <>
              <RuleTypeEuiFormRow
                $isVisible={isAlertSuppressionEnabled && isThresholdRule}
                fullWidth
              >
                <EuiToolTip content={alertSuppressionUpsellingMessage} position="right">
                  <CommonUseField
                    path="enableThresholdSuppression"
                    componentProps={{
                      idAria: 'detectionEngineStepDefineRuleThresholdEnableSuppression',
                      'data-test-subj': 'detectionEngineStepDefineRuleThresholdEnableSuppression',
                      euiFieldProps: {
                        label: i18n.getEnableThresholdSuppressionLabel(thresholdFields),
                        disabled: !isAlertSuppressionLicenseValid,
                      },
                    }}
                  />
                </EuiToolTip>
              </RuleTypeEuiFormRow>

              <RuleTypeEuiFormRow
                $isVisible={isAlertSuppressionEnabled && !isThresholdRule}
                data-test-subj="alertSuppressionInput"
              >
                <UseField
                  path="groupByFields"
                  component={MultiSelectFieldsAutocomplete}
                  componentProps={{
                    browserFields: termsAggregationFields,
                    disabledText: alertSuppressionUpsellingMessage,
                    isDisabled:
                      !isAlertSuppressionLicenseValid || disableSuppressionFieldsForEQLSequence,
                  }}
                />
              </RuleTypeEuiFormRow>

              <IntendedRuleTypeEuiFormRow
                $isVisible={isAlertSuppressionEnabled}
                data-test-subj="alertSuppressionDuration"
              >
                <UseMultiFields
                  fields={{
                    groupByRadioSelection: {
                      path: 'groupByRadioSelection',
                    },
                    groupByDurationValue: {
                      path: 'groupByDuration.value',
                    },
                    groupByDurationUnit: {
                      path: 'groupByDuration.unit',
                    },
                  }}
                >
                  {GroupByChildren}
                </UseMultiFields>
              </IntendedRuleTypeEuiFormRow>

              <IntendedRuleTypeEuiFormRow
                // threshold rule does not have this suppression configuration
                $isVisible={isAlertSuppressionEnabled && !isThresholdRule}
                data-test-subj="alertSuppressionMissingFields"
                label={
                  <span>
                    {i18n.ALERT_SUPPRESSION_MISSING_FIELDS_FORM_ROW_LABEL} <SuppressionInfoIcon />
                  </span>
                }
                fullWidth
              >
                <UseMultiFields
                  fields={{
                    suppressionMissingFields: {
                      path: 'suppressionMissingFields',
                    },
                  }}
                >
                  {AlertSuppressionMissingFields}
                </UseMultiFields>
              </IntendedRuleTypeEuiFormRow>
            </>
          </EuiToolTip>
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
    </>
  );
};
export const StepDefineRule = memo(StepDefineRuleComponent);

const StepDefineRuleReadOnlyComponent: FC<StepDefineRuleReadOnlyProps> = ({
  addPadding,
  defaultValues: data,
  descriptionColumns,
  indexPattern,
}) => {
  const dataForDescription: Partial<DefineStepRule> = getStepDataDataSource(data);
  const transformFields = useExperimentalFeatureFieldsTransform();

  return (
    <StepContentWrapper data-test-subj="definitionRule" addPadding={addPadding}>
      <StepRuleDescription
        columns={descriptionColumns}
        schema={filterRuleFieldsForType(schema, data.ruleType)}
        data={filterRuleFieldsForType(transformFields(dataForDescription), data.ruleType)}
        indexPatterns={indexPattern}
      />
    </StepContentWrapper>
  );
};
export const StepDefineRuleReadOnly = memo(StepDefineRuleReadOnlyComponent);

export function aggregatableFields<T extends { aggregatable: boolean }>(browserFields: T[]): T[] {
  return browserFields.filter((field) => field.aggregatable === true);
}
