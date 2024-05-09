/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCheckbox, EuiFormRow, EuiIconTip, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  builtInAggregationTypes,
  ForLastExpression,
  GroupByExpression,
  IErrorObject,
  OfExpression,
  ThresholdExpression,
  ValueExpression,
  WhenExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { builtInGroupByTypes, FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { SourceFields } from '../../components/source_fields_select';
import { CommonRuleParams, SourceField } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { TestQueryRow, TestQueryRowProps } from '../test_query_row';
import { QueryThresholdHelpPopover } from './threshold_help_popover';

export interface RuleCommonExpressionsProps extends CommonRuleParams {
  esFields: FieldOption[];
  errors: IErrorObject;
  hasValidationErrors: boolean;
  onChangeSelectedAggField: Parameters<typeof OfExpression>[0]['onChangeSelectedAggField'];
  onChangeSelectedAggType: Parameters<typeof WhenExpression>[0]['onChangeSelectedAggType'];
  onChangeSelectedGroupBy: Parameters<typeof GroupByExpression>[0]['onChangeSelectedGroupBy'];
  onChangeSelectedTermField: Parameters<typeof GroupByExpression>[0]['onChangeSelectedTermField'];
  onChangeSelectedTermSize: Parameters<typeof GroupByExpression>[0]['onChangeSelectedTermSize'];
  onChangeThreshold: Parameters<typeof ThresholdExpression>[0]['onChangeSelectedThreshold'];
  onChangeThresholdComparator: Parameters<
    typeof ThresholdExpression
  >[0]['onChangeSelectedThresholdComparator'];
  onChangeWindowSize: Parameters<typeof ForLastExpression>[0]['onChangeWindowSize'];
  onChangeWindowUnit: Parameters<typeof ForLastExpression>[0]['onChangeWindowUnit'];
  onChangeSizeValue: Parameters<typeof ValueExpression>[0]['onChangeSelectedValue'];
  onTestFetch: TestQueryRowProps['fetch'];
  onCopyQuery?: TestQueryRowProps['copyQuery'];
  onChangeExcludeHitsFromPreviousRun: (exclude: boolean) => void;
  canSelectMultiTerms?: boolean;
  onChangeSourceFields: (selectedSourceFields: SourceField[]) => void;
}

export const RuleCommonExpressions: React.FC<RuleCommonExpressionsProps> = ({
  esFields,
  thresholdComparator,
  threshold,
  timeWindowSize,
  timeWindowUnit,
  aggType,
  aggField,
  groupBy,
  termField,
  termSize,
  size,
  sourceFields,
  errors,
  hasValidationErrors,
  onChangeSelectedAggField,
  onChangeSelectedAggType,
  onChangeSelectedGroupBy,
  onChangeSelectedTermField,
  onChangeSelectedTermSize,
  onChangeThreshold,
  onChangeThresholdComparator,
  onChangeWindowSize,
  onChangeWindowUnit,
  onChangeSizeValue,
  onTestFetch,
  onCopyQuery,
  excludeHitsFromPreviousRun,
  onChangeExcludeHitsFromPreviousRun,
  canSelectMultiTerms,
  onChangeSourceFields,
}) => {
  const [isExcludeHitsDisabled, setIsExcludeHitsDisabled] = useState<boolean>(false);

  useEffect(() => {
    if (groupBy) {
      setIsExcludeHitsDisabled(groupBy !== builtInGroupByTypes.all.value);
    }
  }, [groupBy]);
  return (
    <>
      <EuiFormRow
        fullWidth
        label={[
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.conditionsPrompt"
            defaultMessage="Set the group, threshold, and time window"
          />,
          <QueryThresholdHelpPopover />,
        ]}
      >
        <WhenExpression
          display="fullWidth"
          data-test-subj="whenExpression"
          aggType={aggType ?? DEFAULT_VALUES.AGGREGATION_TYPE}
          onChangeSelectedAggType={onChangeSelectedAggType}
        />
      </EuiFormRow>
      {aggType && builtInAggregationTypes[aggType].fieldRequired ? (
        <OfExpression
          aggField={aggField}
          data-test-subj="aggTypeExpression"
          fields={esFields}
          aggType={aggType}
          errors={errors}
          display="fullWidth"
          onChangeSelectedAggField={onChangeSelectedAggField}
        />
      ) : null}
      <GroupByExpression
        groupBy={groupBy || DEFAULT_VALUES.GROUP_BY}
        data-test-subj="groupByExpression"
        termField={termField}
        termSize={termSize}
        errors={errors}
        fields={esFields}
        display="fullWidth"
        canSelectMultiTerms={canSelectMultiTerms}
        onChangeSelectedGroupBy={onChangeSelectedGroupBy}
        onChangeSelectedTermField={onChangeSelectedTermField}
        onChangeSelectedTermSize={onChangeSelectedTermSize}
      />
      <ThresholdExpression
        data-test-subj="thresholdExpression"
        thresholdComparator={thresholdComparator ?? DEFAULT_VALUES.THRESHOLD_COMPARATOR}
        threshold={threshold ?? DEFAULT_VALUES.THRESHOLD}
        errors={errors}
        display="fullWidth"
        popupPosition="upLeft"
        onChangeSelectedThreshold={onChangeThreshold}
        onChangeSelectedThresholdComparator={onChangeThresholdComparator}
      />
      <ForLastExpression
        data-test-subj="forLastExpression"
        popupPosition="upLeft"
        timeWindowSize={timeWindowSize ?? DEFAULT_VALUES.TIME_WINDOW_SIZE}
        timeWindowUnit={timeWindowUnit ?? DEFAULT_VALUES.TIME_WINDOW_UNIT}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        label={[
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.selectSizePrompt"
            defaultMessage="Set the number of documents to send"
          />,
          <EuiIconTip
            position="right"
            color="subdued"
            type="questionInCircle"
            content={i18n.translate('xpack.stackAlerts.esQuery.ui.selectSizePrompt.toolTip', {
              defaultMessage:
                'Specify the number of documents to pass to the configured actions when the threshold condition is met.',
            })}
          />,
        ]}
      >
        <ValueExpression
          description={i18n.translate('xpack.stackAlerts.esQuery.ui.sizeExpression', {
            defaultMessage: 'Size',
          })}
          data-test-subj="sizeValueExpression"
          value={size}
          errors={errors.size}
          display="fullWidth"
          popupPosition="upLeft"
          onChangeSelectedValue={onChangeSizeValue}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiCheckbox
          disabled={isExcludeHitsDisabled}
          data-test-subj="excludeHitsFromPreviousRunExpression"
          checked={excludeHitsFromPreviousRun}
          id="excludeHitsFromPreviousRunExpressionId"
          onChange={(event) => {
            onChangeExcludeHitsFromPreviousRun(event.target.checked);
          }}
          label={i18n.translate('xpack.stackAlerts.esQuery.ui.excludePreviousHitsExpression', {
            defaultMessage: 'Exclude matches from previous runs',
          })}
        />
      </EuiFormRow>

      <SourceFields
        onChangeSourceFields={onChangeSourceFields}
        esFields={esFields}
        sourceFields={sourceFields}
        errors={errors.sourceFields}
      />
      <EuiSpacer size="m" />
      <TestQueryRow
        fetch={onTestFetch}
        copyQuery={onCopyQuery}
        hasValidationErrors={hasValidationErrors}
      />
    </>
  );
};
