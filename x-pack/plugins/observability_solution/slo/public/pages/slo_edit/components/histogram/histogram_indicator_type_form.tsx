/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { IndexAndTimestampField } from '../custom_common/index_and_timestamp_field';
import { useCreateDataView } from '../../../../hooks/use_create_data_view';
import { GroupByField } from '../common/group_by_field';
import { CreateSLOForm } from '../../types';
import { DataPreviewChart } from '../common/data_preview_chart';
import { QueryBuilder } from '../common/query_builder';
import { DATA_VIEW_FIELD } from '../custom_common/index_selection';
import { HistogramIndicator } from './histogram_indicator';

export function HistogramIndicatorTypeForm() {
  const { watch } = useFormContext<CreateSLOForm>();
  const index = watch('indicator.params.index');
  const dataViewId = watch(DATA_VIEW_FIELD);

  const { dataView, loading: isIndexFieldsLoading } = useCreateDataView({
    indexPatternString: index,
    dataViewId,
  });

  const histogramFields = dataView?.fields.filter((field) => field.type === 'histogram');

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.slo.sloEdit.sliType.histogram.sourceTitle"
            defaultMessage="Source"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="l">
        <IndexAndTimestampField dataView={dataView} isLoading={isIndexFieldsLoading} />

        <EuiFlexItem>
          <QueryBuilder
            dataTestSubj="histogramIndicatorFormQueryFilterInput"
            dataView={dataView}
            label={i18n.translate('xpack.slo.sloEdit.sliType.histogram.queryFilter', {
              defaultMessage: 'Query filter',
            })}
            name="indicator.params.filter"
            placeholder={i18n.translate('xpack.slo.sloEdit.sliType.histogram.customFilter', {
              defaultMessage: 'Custom filter to apply on the index',
            })}
            tooltip={
              <EuiIconTip
                content={i18n.translate(
                  'xpack.slo.sloEdit.sliType.histogram.customFilter.tooltip',
                  {
                    defaultMessage:
                      'This KQL query can be used to filter the documents with some relevant criteria.',
                  }
                )}
                position="top"
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.slo.sloEdit.sliType.histogram.goodTitle"
                defaultMessage="Good events"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <HistogramIndicator
            type="good"
            histogramFields={histogramFields ?? []}
            isLoadingIndex={isIndexFieldsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.slo.sloEdit.sliType.histogram.totalTitle"
                defaultMessage="Total events"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <HistogramIndicator
            type="total"
            histogramFields={histogramFields ?? []}
            isLoadingIndex={isIndexFieldsLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>

        <GroupByField dataView={dataView} isLoading={isIndexFieldsLoading} />

        <DataPreviewChart />
      </EuiFlexGroup>
    </>
  );
}
