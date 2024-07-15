/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from '@kbn/ui-actions-plugin/public';
import type { EuiComboBox, EuiTitleSize } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiToolTip } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty, noop } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';
import { sumBy } from 'lodash';

import type { Filter } from '@kbn/es-query';

import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { APP_UI_ID } from '../../../../../common/constants';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import { HeaderSection } from '../../../../common/components/header_section';
import { getDetectionEngineUrl, useFormatUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import {
  showInitialLoadingSpinner,
  createGenericSubtitle,
  createEmbeddedDataSubtitle,
} from './helpers';
import * as i18n from './translations';
import { LinkButton } from '../../../../common/components/links';
import { SecurityPageName } from '../../../../app/types';
import { DEFAULT_STACK_BY_FIELD, PANEL_HEIGHT } from '../common/config';
import type { AlertsStackByField } from '../common/types';
import { KpiPanel, StackByComboBox } from '../common/components';

import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { GROUP_BY_TOP_LABEL } from '../common/translations';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getAlertsHistogramLensAttributes as getLensAttributes } from '../../../../common/components/visualization_actions/lens_attributes/common/alerts/alerts_histogram';
import { SourcererScopeName } from '../../../../sourcerer/store/model';
import { VisualizationEmbeddable } from '../../../../common/components/visualization_actions/visualization_embeddable';
import { useAlertHistogramCount } from '../../../hooks/alerts_visualization/use_alert_histogram_count';
import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';

export const DETECTIONS_HISTOGRAM_ID = 'detections-histogram';

const ViewAlertsFlexItem = styled(EuiFlexItem)`
  margin-left: ${({ theme }) => theme.eui.euiSizeL};
`;

const CHART_HEIGHT = 155; // px

interface AlertsHistogramPanelProps {
  alignHeader?: 'center' | 'baseline' | 'stretch' | 'flexStart' | 'flexEnd';
  chartHeight?: number;
  comboboxRef?: React.RefObject<EuiComboBox<string | number | string[] | undefined>>;
  defaultStackByOption?: string;
  extraActions?: Action[];
  filters?: Filter[];
  headerChildren?: React.ReactNode;
  inspectTitle?: React.ReactNode;
  onFieldSelected?: (field: string) => void;
  /** Override all defaults, and only display this field */
  onlyField?: AlertsStackByField;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  panelHeight?: number;
  setComboboxInputRef?: (inputRef: HTMLInputElement | null) => void;
  showGroupByPlaceholder?: boolean;
  showLinkToAlerts?: boolean;
  showStackBy?: boolean;
  showTotalAlertsCount?: boolean;
  signalIndexName: string | null;
  stackByLabel?: string;
  stackByWidth?: number;
  timelineId?: string;
  title?: React.ReactNode;
  titleSize?: EuiTitleSize;
  updateDateRange: UpdateDateRange;
  hideQueryToggle?: boolean;
  isExpanded?: boolean;
  setIsExpanded?: (status: boolean) => void;
}

export const AlertsHistogramPanel = memo<AlertsHistogramPanelProps>(
  ({
    alignHeader,
    chartHeight = CHART_HEIGHT,
    comboboxRef,
    defaultStackByOption = DEFAULT_STACK_BY_FIELD,
    extraActions,
    filters,
    headerChildren,
    inspectTitle,
    onFieldSelected,
    onlyField,
    paddingSize = 'm',
    panelHeight = PANEL_HEIGHT,
    setComboboxInputRef,
    showGroupByPlaceholder = false,
    showLinkToAlerts = false,
    showStackBy = true,
    showTotalAlertsCount = false,
    stackByLabel,
    stackByWidth,
    title = i18n.HISTOGRAM_HEADER,
    titleSize = 'm',
    hideQueryToggle = false,
    isExpanded,
    setIsExpanded,
  }) => {
    const { to, from } = useGlobalTime();

    // create a unique, but stable (across re-renders) query id
    const uniqueQueryId = useMemo(() => `${DETECTIONS_HISTOGRAM_ID}-${uuidv4()}`, []);
    const visualizationId = `alerts-trend-embeddable-${uniqueQueryId}`;
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [selectedStackByOption, setSelectedStackByOption] = useState<string>(
      onlyField == null ? defaultStackByOption : onlyField
    );
    const isAlertsPageChartsEnabled = useIsExperimentalFeatureEnabled('alertsPageChartsEnabled');

    const onSelect = useCallback(
      (field: string) => {
        setSelectedStackByOption(field);
        if (onFieldSelected != null) {
          onFieldSelected(field);
        }
      },
      [onFieldSelected]
    );

    useEffect(() => {
      setSelectedStackByOption(onlyField == null ? defaultStackByOption : onlyField);
    }, [defaultStackByOption, onlyField]);

    const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTIONS_HISTOGRAM_ID);

    const toggleQuery = useCallback(
      (newToggleStatus: boolean) => {
        if (isAlertsPageChartsEnabled && setIsExpanded !== undefined) {
          setIsExpanded(newToggleStatus);
        } else {
          setToggleStatus(newToggleStatus);
        }
      },
      [setToggleStatus, setIsExpanded, isAlertsPageChartsEnabled]
    );

    const timerange = useMemo(() => ({ from, to }), [from, to]);

    const kibana = useKibana();
    const { navigateToApp } = kibana.services.application;
    const { formatUrl, search: urlSearch } = useFormatUrl(SecurityPageName.alerts);
    const { loading: isLoadingAlerts } = useVisualizationResponse({
      visualizationId,
    });
    const totalAlerts = useAlertHistogramCount({
      visualizationId,
    });

    const goToDetectionEngine = useCallback(
      (ev) => {
        ev.preventDefault();
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.alerts,
          path: getDetectionEngineUrl(urlSearch),
        });
      },
      [navigateToApp, urlSearch]
    );

    useEffect(() => {
      let canceled = false;
      if (!canceled && !showInitialLoadingSpinner({ isInitialLoading, isLoadingAlerts })) {
        setIsInitialLoading(false);
      }

      return () => {
        canceled = true; // prevent long running data fetches from updating state after unmounting
      };
    }, [isInitialLoading, isLoadingAlerts, setIsInitialLoading]);

    const linkButton = useMemo(() => {
      if (showLinkToAlerts) {
        return (
          <ViewAlertsFlexItem grow={false}>
            <LinkButton
              data-test-subj="alerts-histogram-panel-go-to-alerts-page"
              onClick={goToDetectionEngine}
              href={formatUrl(getDetectionEngineUrl())}
            >
              {i18n.VIEW_ALERTS}
            </LinkButton>
          </ViewAlertsFlexItem>
        );
      }
    }, [showLinkToAlerts, goToDetectionEngine, formatUrl]);

    const titleText = useMemo(
      () => (onlyField == null ? title : i18n.TOP(onlyField)),
      [onlyField, title]
    );

    const showHistogram = useMemo(() => {
      if (isAlertsPageChartsEnabled) {
        if (isExpanded !== undefined) {
          // alerts page
          return isExpanded;
        } else {
          // rule details page and overview page
          return toggleStatus;
        }
      } else {
        return toggleStatus;
      }
    }, [isAlertsPageChartsEnabled, isExpanded, toggleStatus]);

    const { responses, loading } = useVisualizationResponse({
      visualizationId,
    });
    const embeddedDataLoaded = !loading && !isEmpty(responses);
    const aggregationBucketsCount = useMemo(
      () =>
        loading
          ? 0
          : sumBy(responses, (responseItem) =>
              sumBy(Object.values(responseItem.aggregations ?? {}), 'buckets.length')
            ),
      [loading, responses]
    );

    const embeddedDataAvailable = !!aggregationBucketsCount;

    const subtitle = showHistogram
      ? createEmbeddedDataSubtitle(embeddedDataLoaded, embeddedDataAvailable, totalAlerts)
      : createGenericSubtitle(isInitialLoading, showTotalAlertsCount, totalAlerts);

    return (
      <KpiPanel
        height={panelHeight}
        hasBorder
        paddingSize={paddingSize}
        data-test-subj="alerts-histogram-panel"
        $toggleStatus={showHistogram}
      >
        <HeaderSection
          alignHeader={alignHeader}
          id={uniqueQueryId}
          inspectTitle={inspectTitle}
          outerDirection="column"
          title={titleText}
          titleSize={titleSize}
          toggleStatus={showHistogram}
          toggleQuery={hideQueryToggle ? undefined : toggleQuery}
          showInspectButton={false}
          subtitle={subtitle}
          isInspectDisabled={false}
        >
          <EuiFlexGroup alignItems="flexStart" data-test-subj="panelFlexGroup" gutterSize="none">
            <EuiFlexItem grow={false}>
              {showStackBy && (
                <>
                  <StackByComboBox
                    data-test-subj="stackByComboBox"
                    inputRef={setComboboxInputRef}
                    onSelect={onSelect}
                    prepend={stackByLabel}
                    ref={comboboxRef}
                    selected={selectedStackByOption}
                    useLensCompatibleFields={true}
                    width={stackByWidth}
                  />
                  {showGroupByPlaceholder && (
                    <>
                      <EuiSpacer data-test-subj="placeholderSpacer" size="s" />
                      <EuiToolTip
                        data-test-subj="placeholderTooltip"
                        content={i18n.NOT_AVAILABLE_TOOLTIP}
                      >
                        <StackByComboBox
                          data-test-subj="stackByPlaceholder"
                          isDisabled={true}
                          onSelect={noop}
                          prepend={GROUP_BY_TOP_LABEL}
                          selected=""
                          useLensCompatibleFields={true}
                          width={stackByWidth}
                        />
                      </EuiToolTip>
                    </>
                  )}
                </>
              )}
              {headerChildren != null && headerChildren}
            </EuiFlexItem>
            {linkButton}
          </EuiFlexGroup>
        </HeaderSection>
        {showHistogram ? (
          <VisualizationEmbeddable
            data-test-subj="embeddable-matrix-histogram"
            extraActions={extraActions}
            extraOptions={{
              filters,
            }}
            getLensAttributes={getLensAttributes}
            height={chartHeight ?? CHART_HEIGHT}
            id={visualizationId}
            inspectTitle={inspectTitle ?? title}
            scopeId={SourcererScopeName.detections}
            stackByField={selectedStackByOption}
            timerange={timerange}
          />
        ) : null}
      </KpiPanel>
    );
  }
);

AlertsHistogramPanel.displayName = 'AlertsHistogramPanel';
