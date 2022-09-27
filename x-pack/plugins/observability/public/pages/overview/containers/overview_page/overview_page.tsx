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
  EuiFlyout,
  EuiFlyoutSize,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiTourStep,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';

import { calculateBucketSize } from './helpers';
import { PageHeaderProps } from './types';

import { EmptySections } from '../../../../components/app/empty_sections';
import { observabilityFeatureId } from '../../../../../common';
import { useTrackPageview, useUiTracker } from '../../../..';
import { ObservabilityHeaderMenu } from '../../../../components/app/header';
import { NewsFeed } from '../../../../components/app/news_feed';
import { Resources } from '../../../../components/app/resources';
import { DatePicker } from '../../../../components/shared/date_picker';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useHasData } from '../../../../hooks/use_has_data';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import { buildEsQuery } from '../../../../utils/build_es_query';
import { getNewsFeed } from '../../../../services/get_news_feed';
import { DataSections, LoadingObservability } from '../../components';
import { SectionContainer } from '../../../../components/app/section';
import { ObservabilityAppServices } from '../../../../application/types';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { paths } from '../../../../config';
import { useDatePickerContext } from '../../../../hooks/use_date_picker_context';
import { ObservabilityStatusProgress } from '../../../../components/app/observability_status/observability_status_progress';
import { ObservabilityStatus } from '../../../../components/app/observability_status';
import { useGuidedSetupProgress } from '../../../../hooks/use_guided_setup_progress';
import { useObservabilityTourContext } from '../../../../components/shared/tour';
import { CAPABILITIES_KEYS, ALERTS_PER_PAGE, ALERTS_TABLE_ID } from './constants';

export function OverviewPage() {
  const trackMetric = useUiTracker({ app: 'observability-overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
    },
  ]);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [refreshNow, setRefreshNow] = useState<number>();

  const {
    cases,
    http,
    application: { capabilities },
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate } = usePluginContext();
  const { relativeStart, relativeEnd, absoluteStart, absoluteEnd } = useDatePickerContext();

  const { data: newsFeed } = useFetcher(() => getNewsFeed({ http }), [http]);

  const { hasAnyData, isAllRequestsComplete } = useHasData();
  const refetch = useRef<() => void>();

  const [isGuidedSetupTourVisible, setGuidedSetupTourVisible] = useState(false);
  const hideGuidedSetupTour = useCallback(() => setGuidedSetupTourVisible(false), []);
  const { isGuidedSetupProgressDismissed } = useGuidedSetupProgress();

  const bucketSize = useMemo(
    () =>
      calculateBucketSize({
        start: absoluteStart,
        end: absoluteEnd,
      }),
    [absoluteStart, absoluteEnd]
  );

  const handleGuidedSetupClick = useCallback(() => {
    if (isGuidedSetupProgressDismissed) {
      trackMetric({ metric: 'guided_setup_view_details_after_dismiss' });
    }
    hideGuidedSetupTour();
    setIsFlyoutVisible(true);
  }, [trackMetric, isGuidedSetupProgressDismissed, hideGuidedSetupTour]);

  const onTimeRangeRefresh = useCallback(() => {
    setRefreshNow(new Date().getTime());
    return refetch.current && refetch.current();
  }, []);

  const CasesContext = cases.ui.getCasesContext();
  const userCasesPermissions = useGetUserCasesPermissions();

  useEffect(() => {
    if (hasAnyData !== true) {
      return;
    }

    CAPABILITIES_KEYS.forEach((feature) => {
      if (capabilities[feature].show === false) {
        trackMetric({
          metric: `oblt_disabled_feature_${feature === 'infrastructure' ? 'metrics' : feature}`,
        });
      }
    });
  }, [capabilities, hasAnyData, trackMetric]);

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  const alertsLink = paths.observability.alerts;

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={isAllRequestsComplete}
      pageHeader={{
        children: (
          <PageHeader
            showTour={isGuidedSetupTourVisible}
            onTourDismiss={hideGuidedSetupTour}
            handleGuidedSetupClick={handleGuidedSetupClick}
            onTimeRangeRefresh={onTimeRangeRefresh}
          />
        ),
      }}
    >
      <>
        <ObservabilityHeaderMenu />
        <ObservabilityStatusProgress
          onViewDetailsClick={() => setIsFlyoutVisible(true)}
          onDismissClick={() => setGuidedSetupTourVisible(true)}
        />
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <SectionContainer
              initialIsOpen={hasAnyData}
              title={i18n.translate('xpack.observability.overview.alerts.title', {
                defaultMessage: 'Alerts',
              })}
              hasError={false}
              appLink={{
                href: alertsLink,
                label: i18n.translate('xpack.observability.overview.alerts.appLink', {
                  defaultMessage: 'Show alerts',
                }),
              }}
            >
              <CasesContext
                owner={[observabilityFeatureId]}
                permissions={userCasesPermissions}
                features={{ alerts: { sync: false } }}
              >
                <AlertsStateTable
                  alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                  configurationId={AlertConsumers.OBSERVABILITY}
                  id={ALERTS_TABLE_ID}
                  flyoutSize={'s' as EuiFlyoutSize}
                  featureIds={[
                    AlertConsumers.APM,
                    AlertConsumers.INFRASTRUCTURE,
                    AlertConsumers.LOGS,
                    AlertConsumers.UPTIME,
                  ]}
                  query={buildEsQuery({
                    from: relativeStart,
                    to: relativeEnd,
                  })}
                  showExpandToDetails={false}
                  pageSize={ALERTS_PER_PAGE}
                  refreshNow={refreshNow}
                />
              </CasesContext>
            </SectionContainer>
          </EuiFlexItem>
          <EuiFlexItem>
            {/* Data sections */}
            {<DataSections bucketSize={bucketSize} />}
            <EmptySections />
          </EuiFlexItem>
          <EuiSpacer size="s" />
        </EuiFlexGroup>
        <EuiHorizontalRule />
        <EuiFlexGroup>
          <EuiFlexItem>
            {/* Resources / What's New sections */}
            <EuiFlexGroup>
              <EuiFlexItem grow={4}>
                {!!newsFeed?.items?.length && <NewsFeed items={newsFeed.items.slice(0, 3)} />}
              </EuiFlexItem>
              <EuiFlexItem grow={2}>
                <Resources />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
      {isFlyoutVisible && (
        <EuiFlyout
          className="oblt__flyout"
          size="s"
          ownFocus
          onClose={() => setIsFlyoutVisible(false)}
          aria-labelledby="statusVisualizationFlyoutTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2
                id="statusVisualizationFlyoutTitle"
                data-test-subj="statusVisualizationFlyoutTitle"
              >
                <FormattedMessage
                  id="xpack.observability.overview.statusVisualizationFlyoutTitle"
                  defaultMessage="Data assistant"
                />
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.observability.overview.statusVisualizationFlyoutDescription"
                  defaultMessage="Track your progress towards adding observability integrations and features."
                />
              </p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <ObservabilityStatus />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </ObservabilityPageTemplate>
  );
}

function PageHeader({
  showTour = false,
  onTourDismiss,
  handleGuidedSetupClick,
  onTimeRangeRefresh,
}: PageHeaderProps) {
  const { relativeStart, relativeEnd, refreshInterval, refreshPaused } = useDatePickerContext();
  const { endTour: endObservabilityTour, isTourVisible: isObservabilityTourVisible } =
    useObservabilityTourContext();

  const buttonRef = useRef();

  return (
    <EuiFlexGroup wrap gutterSize="s" justifyContent="flexEnd">
      <EuiFlexItem grow={1}>
        <EuiTitle>
          <h1 className="eui-textNoWrap">{overviewPageTitle}</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DatePicker
          rangeFrom={relativeStart}
          rangeTo={relativeEnd}
          refreshInterval={refreshInterval}
          refreshPaused={refreshPaused}
          onTimeRangeRefresh={onTimeRangeRefresh}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ alignItems: 'flex-end' }}>
        <EuiButton
          // @ts-expect-error the EUI verson that kibana uses right now doesn't have the correct types
          buttonRef={buttonRef}
          data-test-subj="guidedSetupButton"
          id="guidedSetupButton"
          color="text"
          iconType="wrench"
          onClick={() => {
            // End the Observability tour if it's visible and the user clicks the data assistant button
            if (isObservabilityTourVisible) {
              endObservabilityTour();
            }
            handleGuidedSetupClick();
          }}
        >
          <FormattedMessage
            id="xpack.observability.overview.guidedSetupButton"
            defaultMessage="Data assistant"
          />
        </EuiButton>
        {showTour ? (
          <EuiTourStep
            // @ts-expect-error the EUI verson that kibana uses right now doesn't have the correct types
            anchor={() => buttonRef.current}
            isStepOpen
            title={i18n.translate('xpack.observability.overview.guidedSetupTourTitle', {
              defaultMessage: 'Data assistant is always available',
            })}
            content={
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.observability.overview.guidedSetupTourContent"
                  defaultMessage="If you're ever in doubt you can always access the data assistant and view your next steps by clicking here."
                />
              </EuiText>
            }
            step={1}
            stepsTotal={1}
            maxWidth={400}
            onFinish={onTourDismiss}
            footerAction={
              <EuiButtonEmpty color="text" flush="right" size="xs" onClick={onTourDismiss}>
                <FormattedMessage
                  id="xpack.observability.overview.guidedSetupTourDismissButton"
                  defaultMessage="Dismiss"
                />
              </EuiButtonEmpty>
            }
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const overviewPageTitle = i18n.translate('xpack.observability.overview.pageTitle', {
  defaultMessage: 'Overview',
});
