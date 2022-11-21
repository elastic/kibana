/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  FieldPopover,
  FieldStats,
  FieldPopoverHeader,
  FieldStatsServices,
  FieldStatsProps,
  FieldStatsState,
} from '@kbn/unified-field-list-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { FieldTopValuesBucket } from '@kbn/unified-field-list-plugin/public';

import type { FieldTopValuesBucketParams } from '@kbn/unified-field-list-plugin/public';
import {
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import numeral from '@elastic/numeral';
import { termQuery } from '../../../../../common/utils/term_query';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetchParams } from '../use_fetch_params';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { useApmDataView } from '../../../../hooks/use_apm_data_view';
import { useTheme } from '../../../../hooks/use_theme';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

const HIGHLIGHTED_BUCKET_PROPS = {
  color: 'accent',
  textProps: {
    color: 'accent',
  },
};
export function kqlQuery(kql: string): estypes.QueryDslQueryContainer[] {
  return !!kql ? [toElasticsearchQuery(fromKueryExpression(kql))] : [];
}

export type OnAddFilter = ({
  fieldName,
  fieldValue,
  include,
}: {
  fieldName: string;
  fieldValue: string | number;
  include: boolean;
}) => void;

type FieldStatsPopoverContentProps = Omit<
  FieldStatsProps,
  'dataViewOrDataViewId'
> & {
  fieldName: string;
  fieldValue: string | number;
  dslQuery: object;
  dataView: DataView;
};

export function FieldStatsPopoverContent({
  fieldName,
  fieldValue,
  services,
  field,
  dataView,
  dslQuery,
  filters,
  fromDate,
  toDate,
  onAddFilter,
  overrideFieldTopValueBar,
}: FieldStatsPopoverContentProps) {
  const [needToFetchIndividualStat, setNeedToFetchIndividualStat] =
    useState(false);

  const onStateChange = useCallback(
    (nextState: FieldStatsState) => {
      const { topValues } = nextState;
      const idxToHighlight = Array.isArray(topValues)
        ? topValues.findIndex((value) => value.key === fieldValue)
        : null;

      setNeedToFetchIndividualStat(
        idxToHighlight === -1 &&
          fieldName !== undefined &&
          fieldValue !== undefined
      );
    },
    [fieldName, fieldValue]
  );

  const params = useFetchParams();
  const { data: fieldValueStats, status } = useFetcher(
    (callApmApi) => {
      if (needToFetchIndividualStat) {
        return callApmApi(
          'GET /internal/apm/correlations/field_value_stats/transactions',
          {
            params: {
              query: {
                ...params,
                fieldName,
                fieldValue,
                // Using sampler shard size to match with unified field list's default
                samplerShardSize: '5000',
              },
            },
          }
        );
      }
    },
    [params, fieldName, fieldValue, needToFetchIndividualStat]
  );
  const progressBarMax = fieldValueStats?.topValuesSampleSize;
  const formatter = dataView.getFormatterForField(field);

  return (
    <>
      <FieldStats
        services={services}
        field={field}
        dataViewOrDataViewId={dataView}
        dslQuery={dslQuery}
        fromDate={fromDate}
        toDate={toDate}
        onAddFilter={onAddFilter}
        overrideFieldTopValueBar={overrideFieldTopValueBar}
        onStateChange={onStateChange}
      />
      {needToFetchIndividualStat ? (
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
              if (progressBarMax === undefined) return null;

              const formatted = formatter.convert(fieldValue);
              const decimal = value.doc_count / progressBarMax;
              const valueText =
                progressBarMax !== undefined
                  ? numeral(decimal).format('0.0%')
                  : '';

              return (
                <FieldTopValuesBucket
                  field={field}
                  fieldValue={fieldValue}
                  formattedPercentage={valueText}
                  formattedFieldValue={formatted}
                  progressValue={decimal}
                  count={value.doc_count}
                  onAddFilter={onAddFilter}
                  overrideFieldTopValueBar={overrideFieldTopValueBar}
                  {...{ 'data-test-subj': 'apmNotInTopTenFieldTopValueBucket' }}
                  {...HIGHLIGHTED_BUCKET_PROPS}
                />
              );
            })
          ) : (
            <EuiText textAlign="center">
              <EuiLoadingSpinner />
            </EuiText>
          )}
        </>
      ) : null}
    </>
  );
}
export function FieldStatsPopover({
  fieldName,
  fieldValue,
  onAddFilter,
}: {
  fieldName: string;
  fieldValue: string | number;
  onAddFilter: OnAddFilter;
}) {
  const {
    query: { kuery: kql },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useFetchParams();

  const {
    data,
    core: { uiSettings },
  } = useApmPluginContext();
  const { dataView } = useApmDataView();
  const {
    services: { fieldFormats, charts },
  } = useKibana<ApmPluginStartDeps>();

  const [infoIsOpen, setInfoOpen] = useState(false);
  const field = dataView?.getFieldByName(fieldName);

  const closePopover = useCallback(() => setInfoOpen(false), []);
  const theme = useTheme();

  const params = useFetchParams();

  const fieldStatsQuery = useMemo(() => {
    const dslQuery = kqlQuery(kql);
    return {
      bool: {
        filter: [
          ...termQuery(SERVICE_NAME, params.serviceName),
          ...termQuery(TRANSACTION_TYPE, params.transactionType),
          ...termQuery(TRANSACTION_NAME, params.transactionName),
          ...dslQuery,
        ],
      },
    };
  }, [params, kql]);

  const fieldStatsServices: Partial<FieldStatsServices> = useMemo(
    () => ({
      uiSettings,
      dataViews: data.dataViews,
      data,
      fieldFormats,
      charts,
    }),
    [uiSettings, data, fieldFormats, charts]
  );

  const addFilter = useCallback(
    (
      popoverField: DataViewField | '_exists_',
      value: unknown,
      type: '+' | '-'
    ) => {
      if (
        popoverField !== '_exists_' &&
        (typeof value === 'number' || typeof value === 'string')
      ) {
        onAddFilter({
          fieldName: popoverField.name,
          fieldValue: value,
          include: type === '+',
        });
      }
    },
    [onAddFilter]
  );

  const overrideFieldTopValueBar = useCallback(
    (fieldTopValuesBucketParams: FieldTopValuesBucketParams) => {
      if (fieldTopValuesBucketParams.type === 'other') {
        return { color: 'primary' };
      }
      return fieldValue === fieldTopValuesBucketParams.fieldValue
        ? HIGHLIGHTED_BUCKET_PROPS
        : {};
    },
    [fieldValue]
  );

  if (!fieldFormats || !charts || !field || !dataView) return null;

  const trigger = (
    <EuiToolTip
      content={i18n.translate(
        'xpack.apm.correlations.fieldContextPopover.descriptionTooltipContent',
        {
          defaultMessage: 'Show top 10 field values',
        }
      )}
    >
      <EuiButtonIcon
        iconType="inspect"
        onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
          setInfoOpen(!infoIsOpen);
        }}
        aria-label={i18n.translate(
          'xpack.apm.correlations.fieldContextPopover.topFieldValuesAriaLabel',
          {
            defaultMessage: 'Show top 10 field values',
          }
        )}
        data-test-subj={'apmCorrelationsContextPopoverButton'}
        style={{ marginLeft: theme.eui.euiSizeXS }}
      />
    </EuiToolTip>
  );

  return (
    <FieldPopover
      isOpen={infoIsOpen}
      closePopover={closePopover}
      button={trigger}
      renderHeader={() => (
        <FieldPopoverHeader field={field} closePopover={closePopover} />
      )}
      renderContent={() => (
        <>
          <FieldStatsPopoverContent
            fieldName={fieldName}
            fieldValue={fieldValue}
            services={fieldStatsServices as FieldStatsServices}
            field={field}
            dataView={dataView}
            dslQuery={fieldStatsQuery}
            fromDate={start}
            toDate={end}
            onAddFilter={addFilter}
            overrideFieldTopValueBar={overrideFieldTopValueBar}
          />
        </>
      )}
    />
  );
}
