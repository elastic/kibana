/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutBody, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import type { Environment } from '../../../../common/environment_rt';
import { useTimeRange } from '../../../hooks/use_time_range';
import { TimeRangeMetadataContextProvider } from '../../../context/time_range_metadata/time_range_metadata_context';
import { ResponsiveFlyout } from '../responsive_flyout';
import { ServiceFlyoutFooter } from './footer';
import { ServiceFlyoutHeader } from './header';
import { ServiceFlyoutOverview } from './overview';
import {
  ServiceFlyoutContextProvider,
  type ServiceFlyoutContextValue,
} from './service_flyout_context';
export type { ServiceFlyoutService } from './types';

export const SERVICE_FLYOUT_TAB_IDS = {
  overview: 'overview',
  alerts: 'alerts',
  slos: 'slos',
} as const;

export type ServiceFlyoutTabId =
  (typeof SERVICE_FLYOUT_TAB_IDS)[keyof typeof SERVICE_FLYOUT_TAB_IDS];

export const SERVICE_FLYOUT_DEFAULT_TAB_ID = SERVICE_FLYOUT_TAB_IDS.overview;

export const SERVICE_FLYOUT_TABS = [
  {
    id: SERVICE_FLYOUT_TAB_IDS.overview,
    label: i18n.translate('xpack.apm.serviceFlyout.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
  },
] as const;

interface ServiceFlyoutProps {
  deps: ServiceFlyoutContextValue['deps'];
  service: ServiceFlyoutContextValue['service'];
  filters: {
    environment: Environment;
    rangeFrom: string;
    rangeTo: string;
    transactionType?: string;
  };
  onView?: (params: { tabId: ServiceFlyoutTabId }) => void;
  onClose: () => void;
}

export function ServiceFlyout({ deps, service, filters, onView, onClose }: ServiceFlyoutProps) {
  const { core, share, lens, dataViews, alerting } = deps;
  const { environment, rangeFrom, rangeTo, transactionType } = filters;
  const title = service.name;
  const titleId = useGeneratedHtmlId({ prefix: 'serviceFlyoutTitle' });
  const [flyoutEnvironment, setFlyoutEnvironment] = useState(environment);
  const [flyoutRange, setFlyoutRange] = useState({ rangeFrom, rangeTo });
  const { start, end } = useTimeRange({
    rangeFrom: flyoutRange.rangeFrom,
    rangeTo: flyoutRange.rangeTo,
  });
  const [flyoutTransactionType, setTransactionType] = useState(transactionType ?? '');
  const [refreshToken, setRefreshToken] = useState(Date.now());

  const [selectedTabId, setSelectedTabId] = useState<ServiceFlyoutTabId>(
    SERVICE_FLYOUT_DEFAULT_TAB_ID
  );

  useEffect(() => {
    onView?.({ tabId: selectedTabId });
  }, [onView, selectedTabId]);

  const renderTabContent = () => {
    switch (selectedTabId) {
      case SERVICE_FLYOUT_TAB_IDS.overview:
        return <ServiceFlyoutOverview />;
      default:
        return null;
    }
  };

  return (
    <ServiceFlyoutContextProvider
      value={{
        deps: { core, share, lens, dataViews, alerting },
        service,
        filters: {
          environment: flyoutEnvironment,
          setEnvironment: setFlyoutEnvironment,
          rangeFrom: flyoutRange.rangeFrom,
          rangeTo: flyoutRange.rangeTo,
          setRange: setFlyoutRange,
          refreshToken,
          onRefresh: () => setRefreshToken(Date.now()),
          transactionType: flyoutTransactionType,
          setTransactionType,
        },
      }}
    >
      <TimeRangeMetadataContextProvider
        uiSettings={core.uiSettings}
        start={start}
        end={end}
        kuery=""
        useSpanName={false}
      >
        <ResponsiveFlyout
          data-test-subj="serviceFlyout"
          flyoutMenuDisplayMode="always"
          onClose={onClose}
          ownFocus={false}
          size="m"
          paddingSize="m"
          resizable
          minWidth={660}
          session="start"
          flyoutMenuProps={{ title }}
          aria-labelledby={titleId}
        >
          <ServiceFlyoutHeader
            title={title}
            titleId={titleId}
            selectedTabId={selectedTabId}
            onSelectedTabIdChange={setSelectedTabId}
          />
          <EuiFlyoutBody>{renderTabContent()}</EuiFlyoutBody>
          <ServiceFlyoutFooter />
        </ResponsiveFlyout>
      </TimeRangeMetadataContextProvider>
    </ServiceFlyoutContextProvider>
  );
}
