/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ForLastExpression,
  IErrorObject,
  ThresholdExpression,
  ValueExpression,
} from '@kbn/triggers-actions-ui-plugin/public';
import { CommonAlertParams } from '../types';
import { DEFAULT_VALUES } from '../constants';
import { TestQueryRow, TestQueryRowProps } from '../test_query_row';
import { QueryThresholdHelpPopover } from './threshold_help_popover';

export interface RuleCommonExpressionsProps {
  thresholdComparator?: CommonAlertParams['thresholdComparator'];
  threshold?: CommonAlertParams['threshold'];
  timeWindowSize: CommonAlertParams['timeWindowSize'];
  timeWindowUnit: CommonAlertParams['timeWindowUnit'];
  size: CommonAlertParams['size'];
  excludeHitsFromPreviousRun: CommonAlertParams['excludeHitsFromPreviousRun'];
  errors: IErrorObject;
  hasValidationErrors: boolean;
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
}

export const RuleCommonExpressions: React.FC<RuleCommonExpressionsProps> = ({
  thresholdComparator,
  threshold,
  timeWindowSize,
  timeWindowUnit,
  size,
  errors,
  hasValidationErrors,
  onChangeThreshold,
  onChangeThresholdComparator,
  onChangeWindowSize,
  onChangeWindowUnit,
  onChangeSizeValue,
  onTestFetch,
  onCopyQuery,
  excludeHitsFromPreviousRun,
  onChangeExcludeHitsFromPreviousRun,
}) => {
  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.stackAlerts.esQuery.ui.conditionsPrompt"
            defaultMessage="Set the threshold and time window"
          />{' '}
          <QueryThresholdHelpPopover />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
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
        timeWindowSize={timeWindowSize}
        timeWindowUnit={timeWindowUnit}
        display="fullWidth"
        errors={errors}
        onChangeWindowSize={onChangeWindowSize}
        onChangeWindowUnit={onChangeWindowUnit}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" responsive={false} gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.stackAlerts.esQuery.ui.selectSizePrompt"
                defaultMessage="Set the number of documents to send"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            position="right"
            color="subdued"
            type="questionInCircle"
            content={i18n.translate('xpack.stackAlerts.esQuery.ui.selectSizePrompt.toolTip', {
              defaultMessage:
                'Specify the number of documents to pass to the configured actions when the threshold condition is met.',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
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
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiCheckbox
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
      <EuiSpacer size="m" />
      <TestQueryRow
        fetch={onTestFetch}
        copyQuery={onCopyQuery}
        hasValidationErrors={hasValidationErrors}
      />
    </>
  );
};
