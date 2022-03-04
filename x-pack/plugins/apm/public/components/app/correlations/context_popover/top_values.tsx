/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiSpacer,
  EuiToolTip,
  EuiText,
  EuiHorizontalRule,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  FieldStats,
  TopValueBucket,
} from '../../../../../common/correlations/field_stats_types';
import { asPercent } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/use_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useFetchParams } from '../use_fetch_params';

export type OnAddFilter = ({
  fieldName,
  fieldValue,
  include,
}: {
  fieldName: string;
  fieldValue: string | number;
  include: boolean;
}) => void;

interface TopValueProps {
  progressBarMax: number;
  barColor: string;
  value: TopValueBucket;
  isHighlighted: boolean;
  fieldName: string;
  onAddFilter?: OnAddFilter;
  valueText?: string;
  reverseLabel?: boolean;
}
export function TopValue({
  progressBarMax,
  barColor,
  value,
  isHighlighted,
  fieldName,
  onAddFilter,
  valueText,
  reverseLabel = false,
}: TopValueProps) {
  const theme = useTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" key={value.key}>
      <EuiFlexItem
        data-test-subj="apmCorrelationsContextPopoverTopValueBar"
        className="eui-textTruncate"
        style={reverseLabel ? { flexFlow: 'column-reverse' } : undefined}
      >
        <EuiProgress
          value={value.doc_count}
          max={progressBarMax}
          color={barColor}
          size="s"
          label={
            <EuiToolTip content={value.key}>
              <span>{value.key}</span>
            </EuiToolTip>
          }
          className="eui-textTruncate"
          aria-label={value.key.toString()}
          valueText={valueText}
          labelProps={
            isHighlighted
              ? {
                  style: { fontWeight: 'bold' },
                }
              : undefined
          }
        />
      </EuiFlexItem>
      {fieldName !== undefined &&
      value.key !== undefined &&
      onAddFilter !== undefined ? (
        <>
          <EuiButtonIcon
            iconSize="s"
            iconType="plusInCircle"
            onClick={() => {
              onAddFilter({
                fieldName,
                fieldValue:
                  typeof value.key === 'number'
                    ? value.key.toString()
                    : value.key,
                include: true,
              });
            }}
            aria-label={i18n.translate(
              'xpack.apm.correlations.fieldContextPopover.addFilterAriaLabel',
              {
                defaultMessage: 'Filter for {fieldName}: "{value}"',
                values: { fieldName, value: value.key },
              }
            )}
            data-test-subj={`apmFieldContextTopValuesAddFilterButton-${value.key}-${value.key}`}
            style={{
              minHeight: 'auto',
              width: theme.eui.euiSizeL,
              paddingRight: 2,
              paddingLeft: 2,
              paddingTop: 0,
              paddingBottom: 0,
            }}
          />
          <EuiButtonIcon
            iconSize="s"
            iconType="minusInCircle"
            onClick={() => {
              onAddFilter({
                fieldName,
                fieldValue:
                  typeof value.key === 'number'
                    ? value.key.toString()
                    : value.key,
                include: false,
              });
            }}
            aria-label={i18n.translate(
              'xpack.apm.correlations.fieldContextPopover.removeFilterAriaLabel',
              {
                defaultMessage: 'Filter out {fieldName}: "{value}"',
                values: { fieldName, value: value.key },
              }
            )}
            data-test-subj={`apmFieldContextTopValuesExcludeFilterButton-${value.key}-${value.key}`}
            style={{
              minHeight: 'auto',
              width: theme.eui.euiSizeL,
              paddingTop: 0,
              paddingBottom: 0,
              paddingRight: 2,
              paddingLeft: 2,
            }}
          />
        </>
      ) : null}
    </EuiFlexGroup>
  );
}

interface TopValuesProps {
  topValueStats: FieldStats;
  compressed?: boolean;
  onAddFilter?: OnAddFilter;
  fieldValue?: string | number;
}

export function TopValues({
  topValueStats,
  onAddFilter,
  fieldValue,
}: TopValuesProps) {
  const { topValues, topValuesSampleSize, count, fieldName } = topValueStats;
  const theme = useTheme();

  const idxToHighlight = Array.isArray(topValues)
    ? topValues.findIndex((value) => value.key === fieldValue)
    : null;

  const params = useFetchParams();
  const { data: fieldValueStats, status } = useFetcher(
    (callApmApi) => {
      if (
        idxToHighlight === -1 &&
        fieldName !== undefined &&
        fieldValue !== undefined
      ) {
        return callApmApi('GET /internal/apm/correlations/field_value_stats', {
          params: {
            query: {
              ...params,
              fieldName,
              fieldValue,
            },
          },
        });
      }
    },
    [params, fieldName, fieldValue, idxToHighlight]
  );
  if (
    !Array.isArray(topValues) ||
    topValues?.length === 0 ||
    fieldValue === undefined
  )
    return null;

  const sampledSize =
    typeof topValuesSampleSize === 'string'
      ? parseInt(topValuesSampleSize, 10)
      : topValuesSampleSize;

  const progressBarMax = sampledSize ?? count;
  return (
    <div
      data-test-subj="apmCorrelationsContextPopoverTopValues"
      style={{
        minWidth: `calc(${theme.eui.euiSizeXXL} * 6.5)`,
        maxWidth: `calc(${theme.eui.euiSizeXXL} * 7.5)`,
      }}
    >
      {Array.isArray(topValues) &&
        topValues.map((value) => {
          const isHighlighted =
            fieldValue !== undefined && value.key === fieldValue;
          const barColor = isHighlighted ? 'accent' : 'primary';
          const valueText =
            progressBarMax !== undefined
              ? numeral(value.doc_count / progressBarMax).format('0.0%') // asPercent(value.doc_count, progressBarMax)
              : undefined;

          return (
            <>
              <EuiSpacer size="s" />
              <TopValue
                value={value}
                barColor={barColor}
                valueText={valueText}
                onAddFilter={onAddFilter}
                progressBarMax={progressBarMax}
                isHighlighted={isHighlighted}
                fieldName={fieldName}
              />
            </>
          );
        })}

      {idxToHighlight === -1 && (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.apm.correlations.fieldContextPopover.notTopTenValueMessage"
              defaultMessage="Selected term is not in the top 10"
            />
          </EuiText>
          <EuiSpacer size="s" />
          {status === FETCH_STATUS.SUCCESS &&
          Array.isArray(fieldValueStats?.topValues) ? (
            fieldValueStats?.topValues.map((value) => {
              const valueText =
                progressBarMax !== undefined
                  ? asPercent(value.doc_count, progressBarMax)
                  : undefined;

              return (
                <TopValue
                  value={value}
                  barColor={'accent'}
                  valueText={valueText}
                  onAddFilter={onAddFilter}
                  progressBarMax={progressBarMax}
                  isHighlighted={true}
                  fieldName={fieldName}
                  reverseLabel={true}
                />
              );
            })
          ) : (
            <EuiText textAlign="center">
              <EuiLoadingSpinner />
            </EuiText>
          )}
        </>
      )}

      {topValueStats.topValuesSampleSize !== undefined && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            {i18n.translate(
              'xpack.apm.correlations.fieldContextPopover.calculatedFromSampleDescription',
              {
                defaultMessage:
                  'Calculated from sample of {sampleSize} documents',
                values: { sampleSize: topValueStats.topValuesSampleSize },
              }
            )}
          </EuiText>
        </>
      )}
    </div>
  );
}
