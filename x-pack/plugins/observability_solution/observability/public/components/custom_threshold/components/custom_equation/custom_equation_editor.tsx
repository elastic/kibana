/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIconTip,
  EuiButtonEmpty,
  EuiSpacer,
  EuiExpression,
  EuiPopover,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { range, first, xor, debounce } from 'lodash';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { DataViewBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { adjustThresholdBasedOnFormat } from '../../helpers/adjust_threshold_based_on_format';
import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../../../common/custom_threshold_rule/types';

import { MetricExpression } from '../../types';
import { CustomMetrics, AggregationTypes, NormalizedFields } from './types';
import { MetricRowWithAgg } from './metric_row_with_agg';
import { ClosablePopoverTitle } from '../closable_popover_title';
import { EQUATION_HELP_MESSAGE } from '../../i18n_strings';

export interface CustomEquationEditorProps {
  onChange: (expression: MetricExpression) => void;
  expression: MetricExpression;
  fields: NormalizedFields;
  aggregationTypes: AggregationTypes;
  errors: IErrorObject;
  dataView: DataViewBase;
}

const NEW_METRIC = {
  name: 'A',
  aggType: Aggregators.COUNT as Aggregators,
};
const MAX_VARIABLES = 26;
const CHAR_CODE_FOR_A = 65;
const CHAR_CODE_FOR_Z = CHAR_CODE_FOR_A + MAX_VARIABLES;
const VAR_NAMES = range(CHAR_CODE_FOR_A, CHAR_CODE_FOR_Z).map((c) => String.fromCharCode(c));

export function CustomEquationEditor({
  onChange,
  expression,
  fields,
  aggregationTypes,
  errors,
  dataView,
}: CustomEquationEditorProps) {
  const [customMetrics, setCustomMetrics] = useState<CustomMetrics>(
    expression?.metrics ?? [NEW_METRIC]
  );
  const [customEqPopoverOpen, setCustomEqPopoverOpen] = useState(false);
  const [equation, setEquation] = useState<string | undefined>(expression?.equation);
  const debouncedOnChange = useMemo(() => debounce(onChange, 500), [onChange]);

  useEffect(() => {
    setCustomMetrics(expression?.metrics ?? [NEW_METRIC]);
    setEquation(expression?.equation);
  }, [expression?.metrics, expression?.equation]);

  const handleAddNewRow = useCallback(() => {
    setCustomMetrics((previous) => {
      const currentVars = previous?.map((m) => m.name) ?? [];
      const name = first(xor(VAR_NAMES, currentVars))!;
      const nextMetrics = [...(previous || []), { ...NEW_METRIC, name }];
      debouncedOnChange({
        ...expression,
        metrics: nextMetrics,
        equation,
        threshold: adjustThresholdBasedOnFormat(previous, nextMetrics, expression.threshold),
      });
      return nextMetrics;
    });
  }, [debouncedOnChange, equation, expression]);

  const handleDelete = useCallback(
    (name: string) => {
      setCustomMetrics((previous) => {
        const nextMetrics = previous?.filter((row) => row.name !== name) ?? [NEW_METRIC];
        const finalMetrics = (nextMetrics.length && nextMetrics) || [NEW_METRIC];
        debouncedOnChange({
          ...expression,
          metrics: finalMetrics,
          equation,
          threshold: adjustThresholdBasedOnFormat(previous, nextMetrics, expression.threshold),
        });
        return finalMetrics;
      });
    },
    [equation, expression, debouncedOnChange]
  );

  const handleChange = useCallback(
    (metric: CustomThresholdExpressionMetric) => {
      setCustomMetrics((previous) => {
        const nextMetrics = previous?.map((m) => (m.name === metric.name ? metric : m));
        debouncedOnChange({
          ...expression,
          metrics: nextMetrics,
          equation,
          threshold: adjustThresholdBasedOnFormat(previous, nextMetrics, expression.threshold),
        });
        return nextMetrics;
      });
    },
    [equation, expression, debouncedOnChange]
  );

  const handleEquationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEquation(e.target.value);
      debouncedOnChange({ ...expression, metrics: customMetrics, equation: e.target.value });
    },
    [debouncedOnChange, expression, customMetrics]
  );

  const disableAdd = customMetrics?.length === MAX_VARIABLES;
  const disableDelete = customMetrics?.length === 1;

  const metricRows = customMetrics?.map((row) => (
    <MetricRowWithAgg
      key={row.name}
      name={row.name}
      aggType={row.aggType}
      aggregationTypes={aggregationTypes}
      field={row.field}
      filter={row.filter}
      fields={fields}
      onAdd={handleAddNewRow}
      onDelete={handleDelete}
      disableAdd={disableAdd}
      disableDelete={disableDelete}
      onChange={handleChange}
      errors={errors}
      dataView={dataView}
    />
  ));

  const placeholder = useMemo(() => {
    return customMetrics?.map((row) => row.name).join(' + ');
  }, [customMetrics]);

  return (
    <div style={{ minWidth: '100%' }}>
      <EuiSpacer size={'s'} />
      {metricRows}
      <EuiFlexGroup>
        <EuiButtonEmpty
          data-test-subj="thresholdRuleCustomEquationEditorAddAggregationFieldButton"
          color={'primary'}
          flush={'left'}
          size="xs"
          iconType={'plusInCircleFilled'}
          onClick={handleAddNewRow}
          isDisabled={disableAdd}
        >
          <FormattedMessage
            id="xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.addCustomRow"
            defaultMessage="Add aggregation/field"
          />
        </EuiButtonEmpty>
      </EuiFlexGroup>
      <EuiSpacer size={'m'} />
      <EuiFlexItem>
        <EuiPopover
          button={
            <EuiFormRow
              data-test-subj="equationAndThreshold"
              fullWidth
              label={i18n.translate(
                'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.equationAndThreshold',
                { defaultMessage: 'Equation and threshold' }
              )}
              error={[errors.equation]}
            >
              <>
                <EuiSpacer size="xs" />
                <EuiExpression
                  data-test-subj="customEquation"
                  description={i18n.translate(
                    'xpack.observability.customThreshold.rule.alertFlyout.customEquationEditor.equationLabel',
                    { defaultMessage: 'Equation' }
                  )}
                  value={equation ?? placeholder}
                  display={'columns'}
                  onClick={() => {
                    setCustomEqPopoverOpen(true);
                  }}
                  isInvalid={errors.equation != null}
                />
              </>
            </EuiFormRow>
          }
          isOpen={customEqPopoverOpen}
          closePopover={() => {
            setCustomEqPopoverOpen(false);
          }}
          display="block"
          ownFocus
          anchorPosition={'downLeft'}
          repositionOnScroll
        >
          <div>
            <ClosablePopoverTitle onClose={() => setCustomEqPopoverOpen(false)}>
              <span>
                <FormattedMessage
                  id="xpack.observability.customThreshold.rule.alertFlyout.customEquationLabel"
                  defaultMessage="Custom equation"
                />
                &nbsp;
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.observability.customThreshold.rule.alertFlyout.customEquationTooltip',
                    {
                      defaultMessage:
                        'This supports basic math (A + B / C) and boolean logic (A < B ? A : B).',
                    }
                  )}
                  position="top"
                />
              </span>
            </ClosablePopoverTitle>
            <EuiFormRow
              fullWidth
              helpText={EQUATION_HELP_MESSAGE}
              isInvalid={errors.equation != null}
            >
              <EuiFieldText
                data-test-subj="thresholdRuleCustomEquationEditorFieldText"
                isInvalid={errors.equation != null}
                compressed
                fullWidth
                placeholder={placeholder}
                onChange={handleEquationChange}
                value={equation ?? ''}
              />
            </EuiFormRow>
          </div>
        </EuiPopover>
      </EuiFlexItem>
    </div>
  );
}
