/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useMemo, useState, useCallback } from 'react';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { DataSourceTypeSelector } from './field_stats_initializer_view_type';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { FieldStatsESQLEditor } from './field_stats_esql_editor';
import type {
  FieldStatisticsTableEmbeddableState,
  FieldStatsInitialState,
} from '../grid_embeddable/types';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';
export interface FieldStatsInitializerProps {
  initialInput?: Partial<FieldStatisticsTableEmbeddableState>;
  onCreate: (props: FieldStatsInitialState) => void;
  onCancel: () => void;
  onPreview: (update: Partial<FieldStatsInitialState>) => Promise<void>;
}

const defaultESQLQuery = { esql: '' };
const defaultTitle = i18n.translate('xpack.dataVisualizer.fieldStatistics.displayName', {
  defaultMessage: 'Field statistics',
});

export const FieldStatisticsInitializer: FC<FieldStatsInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
  onPreview,
}) => {
  const {
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
    uiSettings,
  } = useDataVisualizerKibana().services;

  const [dataViewId, setDataViewId] = useState(initialInput?.dataViewId ?? '');
  const [viewType, setViewType] = useState(
    initialInput?.viewType ?? FieldStatsInitializerViewType.ESQL
  );
  // @TODO: remove
  console.log(`--@@initialInput?.query`, initialInput?.query);
  const [esqlQuery, setQuery] = useState<AggregateQuery>(initialInput?.query ?? defaultESQLQuery);
  const isEsqlEnabled = useMemo(() => uiSettings.get(ENABLE_ESQL), [uiSettings]);

  const isEsqlMode = viewType === FieldStatsInitializerViewType.ESQL;
  const updatedProps = useMemo(() => {
    return {
      viewType,
      title: initialInput?.title ?? defaultTitle,
      dataViewId: isEsqlMode ? undefined : dataViewId,
      query: isEsqlMode ? esqlQuery : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, viewType, esqlQuery.esql, isEsqlMode]);
  const onESQLQuerySubmit = useCallback(
    async (query: AggregateQuery, abortController: AbortController) => {
      await onPreview({
        viewType,
        dataViewId: undefined,
        query,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEsqlMode]
  );
  const isEsqlFormValid = isEsqlMode ? isEsqlEnabled && isESQLQuery(esqlQuery) : true;
  const isDataViewFormValid =
    viewType === FieldStatsInitializerViewType.DATA_VIEW ? dataViewId !== '' : true;

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={'changePointConfig'}>
            <FormattedMessage
              id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.modalTitle"
              defaultMessage="Field statistics configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <DataSourceTypeSelector value={viewType} onChange={setViewType} />
          {viewType === FieldStatsInitializerViewType.DATA_VIEW ? (
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.dataVisualizer.fieldStatisticsDashboardPanel.dataViewLabel',
                {
                  defaultMessage: 'Data view',
                }
              )}
            >
              <IndexPatternSelect
                autoFocus={!dataViewId}
                fullWidth
                compressed
                indexPatternId={dataViewId}
                placeholder={i18n.translate(
                  'xpack.dataVisualizer.fieldStatisticsDashboardPanel.dataViewSelectorPlaceholder',
                  {
                    defaultMessage: 'Select data view',
                  }
                )}
                onChange={(newId) => {
                  setDataViewId(newId ?? '');
                }}
              />
            </EuiFormRow>
          ) : null}
          {isEsqlMode && isEsqlEnabled ? (
            <FieldStatsESQLEditor
              query={esqlQuery}
              setQuery={setQuery}
              onQuerySubmit={onESQLQuerySubmit}
            />
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="fieldStatsInitializerCancelButton">
              <FormattedMessage
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.setupModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="fieldStatsInitializerConfirmButton"
              isDisabled={!isEsqlFormValid || !isDataViewFormValid}
              onClick={onCreate.bind(null, updatedProps)}
              fill
            >
              <FormattedMessage
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.setupModal.confirmButtonLabel"
                defaultMessage="Confirm"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
