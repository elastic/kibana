/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { HeaderTitle } from '../../../pages/slo_details/components/header_title';
import {
  OVERVIEW_TAB_ID,
  SloDetails,
  SloTabId,
} from '../../../pages/slo_details/components/slo_details';
import { useSloDetailsTabs } from '../../../pages/slo_details/hooks/use_slo_details_tabs';
import { getSloFormattedSummary } from '../../../pages/slos/hooks/use_slo_summary';
import { useKibana } from '../../../hooks/use_kibana';

export function SloOverviewDetails({
  slo,
  setSelectedSlo,
}: {
  slo: SLOWithSummaryResponse | null;
  setSelectedSlo: (slo: SLOWithSummaryResponse | null) => void;
}) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    uiSettings,
  } = useKibana().services;

  const onClose = () => {
    setSelectedSlo(null);
  };

  const [selectedTabId, setSelectedTabId] = useState<SloTabId>(OVERVIEW_TAB_ID);

  const { tabs } = useSloDetailsTabs({
    slo,
    isAutoRefreshing: false,
    selectedTabId,
    setSelectedTabId,
  });

  if (!slo) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.slo.sloOverviewDetails.h2.detailsLabel', {
              defaultMessage: '{sloName}',
              values: { sloName: slo.name },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <HeaderTitle slo={slo} isLoading={false} />
        <EuiTabs>
          {tabs.map((tab, index) => (
            <EuiTab
              key={index}
              onClick={'onClick' in tab ? tab.onClick : undefined}
              isSelected={tab.id === selectedTabId}
              append={'append' in tab ? tab.append : null}
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size="m" />
        <SloDetails slo={slo} isAutoRefreshing={false} selectedTabId={selectedTabId} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="o11ySloOverviewDetailsCloseButton" onClick={onClose}>
              {i18n.translate('xpack.slo.sloOverviewDetails.button.closeLabel', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => {
                const { sloDetailsUrl } = getSloFormattedSummary(slo!, uiSettings, basePath);
                navigateToUrl(sloDetailsUrl);
              }}
              data-test-subj="o11ySloOverviewDetailsDetailsButton"
            >
              {i18n.translate('xpack.slo.sloOverviewDetails.button.detailsLabel', {
                defaultMessage: 'Details',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
