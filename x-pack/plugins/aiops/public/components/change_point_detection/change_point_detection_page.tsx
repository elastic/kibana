/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC, useCallback, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Query } from '@kbn/es-query';
import {
  LazySavedObjectSaveModalDashboard,
  SaveModalDashboardProps,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { useTimeRangeUpdates } from '@kbn/ml-date-picker';
import { EmbeddableChangePointChartInput } from '../../embeddable/embeddable_change_point_chart';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '../../embeddable/embeddable_change_point_chart_factory';
import { ChartsGridContainer } from './charts_grid';
import { FieldsConfig } from './fields_config';
import { useDataSource } from '../../hooks/use_data_source';
import { ChangePointTypeFilter } from './change_point_type_filter';
import { SearchBarWrapper } from './search_bar';
import { useChangePointDetectionContext } from './change_point_detection_context';
import { type ChangePointType } from './constants';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const ChangePointDetectionPage: FC = () => {
  const { embeddable } = useAiopsAppContext();

  const timeRange = useTimeRangeUpdates();

  const [isFlyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [attachPopoverVisible, setAttachPopoverVisible] = useState<boolean>(false);
  const [dashboardAttachment, setDashboardAttachment] = useState<boolean>(false);
  const [applyTimeRangeEmbeddable, setApplyTimeRangeEmbeddable] = useState<boolean>(false);

  const {
    requestParams,
    updateRequestParams,
    resultFilters,
    updateFilters,
    resultQuery,
    metricFieldOptions,
    selectedChangePoints,
  } = useChangePointDetectionContext();

  const { dataView } = useDataSource();

  const setQuery = useCallback(
    (query: Query) => {
      updateRequestParams({ query });
    },
    [updateRequestParams]
  );

  const setChangePointType = useCallback(
    (changePointType: ChangePointType[] | undefined) => {
      updateRequestParams({ changePointType });
    },
    [updateRequestParams]
  );

  const onSaveCallback: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable.getStateTransfer();

      const fieldConfig = {
        metricField: selectedChangePoints[0][0].metricField,
        fn: selectedChangePoints[0][0].fn,
        splitField: selectedChangePoints[0][0].splitField,
      };

      const embeddableInput: Partial<EmbeddableChangePointChartInput> = {
        title: newTitle,
        description: newDescription,
        dataViewId: dataView!.id,
        metricField: fieldConfig.metricField,
        splitField: fieldConfig.splitField,
        fn: fieldConfig.fn,
        partitions: selectedChangePoints[0].map((v) => v.group?.value as string),
        ...(applyTimeRangeEmbeddable ? { timeRange } : {}),
      };

      const state = {
        input: embeddableInput,
        type: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, selectedChangePoints, dataView, applyTimeRangeEmbeddable, timeRange]
  );

  if (metricFieldOptions.length === 0) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.aiops.index.dataViewWithoutMetricNotificationTitle', {
          defaultMessage: 'The data view "{dataViewTitle}" does not contain any metric fields.',
          values: { dataViewTitle: dataView.getName() },
        })}
        color="danger"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.aiops.index.dataViewWithoutMetricNotificationDescription', {
            defaultMessage:
              'Change point detection can only be run on data views with a metric field.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  const hasSelectedChangePoints = Object.values(selectedChangePoints).some((v) => v.length > 0);

  return (
    <div data-test-subj="aiopsChangePointDetectionPage">
      <SearchBarWrapper
        query={resultQuery}
        onQueryChange={setQuery}
        filters={resultFilters}
        onFiltersChange={updateFilters}
      />

      <EuiSpacer size="m" />

      <EuiFlexGroup alignItems={'center'} justifyContent={'spaceBetween'}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems={'center'}>
            <EuiFlexItem grow={false}>
              <EuiText size={'s'}>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.aggregationIntervalTitle"
                  defaultMessage="Aggregation interval: "
                />
                {requestParams.interval}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={
                  hasSelectedChangePoints ? (
                    ''
                  ) : (
                    <FormattedMessage
                      id="xpack.aiops.changePointDetection.viewSelectedChartsToltip"
                      defaultMessage="Select change points to view them in detail."
                    />
                  )
                }
              >
                <EuiButtonEmpty
                  onClick={() => setFlyoutVisible(!isFlyoutVisible)}
                  size={'s'}
                  disabled={!hasSelectedChangePoints}
                  data-test-subj={'aiopsChangePointDetectionViewSelected'}
                >
                  <FormattedMessage
                    id="xpack.aiops.changePointDetection.viewSelectedButtonLabel"
                    defaultMessage="View selected"
                  />
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={
                  hasSelectedChangePoints ? (
                    ''
                  ) : (
                    <FormattedMessage
                      id="xpack.aiops.changePointDetection.attachSelectedChartsTooltip"
                      defaultMessage="Select change points to attach them to dashboard or case."
                    />
                  )
                }
              >
                <EuiPopover
                  id={'sadfsdf'}
                  button={
                    <EuiButtonEmpty
                      onClick={setAttachPopoverVisible.bind(null, true)}
                      size={'s'}
                      disabled={!hasSelectedChangePoints}
                      data-test-subj={'aiopsChangePointDetectionAttachSelected'}
                    >
                      <FormattedMessage
                        id="xpack.aiops.changePointDetection.attachSelectedButtonLabel"
                        defaultMessage="Attach selected"
                      />
                    </EuiButtonEmpty>
                  }
                  isOpen={attachPopoverVisible}
                  closePopover={setAttachPopoverVisible.bind(null, false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel>
                    <EuiContextMenuItem
                      key="item-1"
                      icon="dashboardApp"
                      size="s"
                      onClick={setDashboardAttachment.bind(null, true)}
                    >
                      <FormattedMessage
                        id="xpack.aiops.changePointDetection.attachToDashboardButtonLabel"
                        defaultMessage="To dashboard"
                      />
                    </EuiContextMenuItem>
                    <EuiContextMenuItem key="item-2" icon="casesApp" size="s">
                      <FormattedMessage
                        id="xpack.aiops.changePointDetection.attachToCaseButtonLabel"
                        defaultMessage="To case"
                      />
                    </EuiContextMenuItem>

                    <EuiHorizontalRule margin="none" />

                    <EuiPanel color="transparent" paddingSize="s">
                      <EuiSwitch
                        label={i18n.translate(
                          'xpack.aiops.changePointDetection.applyTimeRangeLabel',
                          {
                            defaultMessage: 'Apply time range',
                          }
                        )}
                        checked={applyTimeRangeEmbeddable}
                        onChange={(e) => setApplyTimeRangeEmbeddable(e.target.checked)}
                        compressed
                      />
                    </EuiPanel>
                  </EuiContextMenuPanel>
                </EuiPopover>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ minWidth: '400px' }}>
          <ChangePointTypeFilter
            value={requestParams.changePointType}
            onChange={setChangePointType}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <FieldsConfig />

      {isFlyoutVisible ? (
        <EuiFlyout
          ownFocus
          onClose={setFlyoutVisible.bind(null, false)}
          aria-labelledby={'change_point_charts'}
          size={'l'}
          data-test-subj={'aiopsChangePointDetectionSelectedCharts'}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={'change_point_charts'}>
                <FormattedMessage
                  id="xpack.aiops.changePointDetection.selectedChangePointsHeader"
                  defaultMessage="Selected change points"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ChartsGridContainer changePoints={selectedChangePoints} />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}

      {dashboardAttachment ? (
        <SavedObjectSaveModalDashboard
          canSaveByReference={false}
          objectType={i18n.translate('xpack.aiops.changePointDetection.objectTypeLabel', {
            defaultMessage: 'Change point chart',
          })}
          documentInfo={{
            title: 'Title',
            description: 'Desc',
          }}
          onClose={() => {}}
          onSave={onSaveCallback}
        />
      ) : null}
    </div>
  );
};
