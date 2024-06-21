/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import { useEffect } from 'react';
import React, { useMemo, useState, useCallback } from 'react';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { FieldStatsESQLEditor } from './field_stats_esql_editor';
import type {
  FieldStatisticsTableEmbeddableState,
  FieldStatsInitialState,
} from '../grid_embeddable/types';
import { FieldStatsInitializerViewType } from '../grid_embeddable/types';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';
import { DataSourceTypeSelector } from './field_stats_initializer_view_type';

export interface FieldStatsInitializerProps {
  initialInput?: Partial<FieldStatisticsTableEmbeddableState>;
  onCreate: (props: FieldStatsInitialState) => Promise<void>;
  onCancel: () => void;
  onPreview: (update: Partial<FieldStatsInitialState>) => Promise<void>;
}

const defaultESQLQuery = { esql: '' };
const defaultTitle = i18n.translate('xpack.dataVisualizer.fieldStatistics.displayName', {
  defaultMessage: 'Field statistics',
});

const isScrollable = false;
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
    initialInput?.viewType ?? FieldStatsInitializerViewType.DATA_VIEW
  );
  const [esqlQuery, setQuery] = useState<AggregateQuery>(initialInput?.query ?? defaultESQLQuery);
  const isEsqlEnabled = useMemo(() => uiSettings.get(ENABLE_ESQL), [uiSettings]);

  useEffect(() => {
    if (initialInput?.viewType === undefined) {
      // By default, if ES|QL is enabled, then use ES|QL
      setViewType(
        isEsqlEnabled ? FieldStatsInitializerViewType.ESQL : FieldStatsInitializerViewType.DATA_VIEW
      );
    }
  }, [isEsqlEnabled, initialInput?.viewType]);

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
      <EuiFlyoutHeader
        hasBorder
        css={css`
          pointer-events: auto;
          background-color: ${euiThemeVars.euiColorEmptyShade};
        `}
      >
        <EuiTitle size="xs">
          <h2 id={'fieldStatsConfig'}>
            <FormattedMessage
              id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.modalTitle"
              defaultMessage="Field statistics configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          padding-left: ${euiThemeVars.euiFormMaxWidth};
          margin-left: -${euiThemeVars.euiFormMaxWidth};
          pointer-events: none;
          .euiFlyoutBody__overflow {
            -webkit-mask-image: none;
            padding-left: inherit;
            margin-left: inherit;
            ${!isScrollable &&
            `
                overflow-y: hidden;
              `}
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            padding: 0;
            block-size: 100%;
          }
        `}
      >
        <EuiForm>
          {initialInput?.viewType === FieldStatsInitializerViewType.ESQL && !isEsqlEnabled ? (
            <>
              <DataSourceTypeSelector value={viewType} onChange={setViewType} />
            </>
          ) : null}
          {viewType === FieldStatsInitializerViewType.ESQL && !isEsqlEnabled ? (
            <>
              <EuiSpacer size="m" />
              <EuiCodeBlock>{esqlQuery.esql}</EuiCodeBlock>
            </>
          ) : null}

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
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.setupModal.applyAndCloseLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
