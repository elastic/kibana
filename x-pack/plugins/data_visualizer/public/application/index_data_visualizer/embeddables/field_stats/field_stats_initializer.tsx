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
  EuiFormRow,
  EuiTitle,
  EuiSpacer,
  EuiIconTip,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import { useEffect } from 'react';
import React, { useMemo, useState, useCallback } from 'react';
import { ENABLE_ESQL, getESQLAdHocDataview } from '@kbn/esql-utils';
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
  isNewPanel: boolean;
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
  isNewPanel,
}) => {
  const {
    data: { dataViews },
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
      dataViewId,
      query: isEsqlMode ? esqlQuery : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, viewType, esqlQuery.esql, isEsqlMode]);
  const onESQLQuerySubmit = useCallback(
    async (query: AggregateQuery, abortController?: AbortController) => {
      const adhocDataView = await getESQLAdHocDataview(query.esql, dataViews);
      if (adhocDataView && adhocDataView.id) {
        setDataViewId(adhocDataView.id);
      }

      await onPreview({
        viewType,
        dataViewId: adhocDataView?.id,
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
        hasBorder={true}
        css={css`
          pointer-events: auto;
          background-color: ${euiThemeVars.euiColorEmptyShade};
        `}
        data-test-subj="editFlyoutHeader"
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs" data-test-subj="inlineEditingFlyoutLabel">
              <h2>
                {isNewPanel
                  ? i18n.translate(
                      'xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.createLable',
                      {
                        defaultMessage: 'Create field statistics',
                      }
                    )
                  : i18n.translate(
                      'xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.editLabel',
                      {
                        defaultMessage: 'Edit field statistics',
                      }
                    )}{' '}
                <EuiIconTip
                  type="iInCircle"
                  content={i18n.translate(
                    'xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.samplingTooltip',
                    {
                      defaultMessage:
                        'Field statistics uses the random sampling aggregation to increase performance, but some accuracy might be lost.',
                    }
                  )}
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
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
          border-bottom: 2px solid ${euiThemeVars.euiBorderColor};
        `}
      >
        <EuiFlexGroup
          css={css`
            block-size: 100%;
          `}
          direction="column"
          gutterSize="none"
        >
          {isNewPanel ? (
            <EuiCallOut
              size="s"
              iconType="iInCircle"
              title={
                <FormattedMessage
                  id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.description"
                  defaultMessage="The visualization displays summarized information and statistics to show how each field in your data is populated."
                />
              }
            />
          ) : null}
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
        </EuiFlexGroup>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={onCancel}
              data-test-subj="fieldStatsInitializerCancelButton"
              flush="left"
              aria-label={i18n.translate(
                'xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.cancelButtonAriaLabel',
                {
                  defaultMessage: 'Cancel applied changes',
                }
              )}
            >
              <FormattedMessage
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onCreate.bind(null, updatedProps)}
              fill
              aria-label={i18n.translate(
                'xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.applyFlyoutAriaLabel',
                {
                  defaultMessage: 'Apply changes',
                }
              )}
              disabled={!isEsqlFormValid || !isDataViewFormValid}
              iconType="check"
              data-test-subj="applyFlyoutButton"
            >
              <FormattedMessage
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.config.applyAndCloseLabel"
                defaultMessage="Apply and close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
