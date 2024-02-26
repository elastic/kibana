/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { HeaderTitle } from '../../../pages/slo_details/components/header_title';
import { getSloFormattedSummary } from '../../../pages/slos/hooks/use_slo_summary';
import { useKibana } from '../../../utils/kibana_react';
import {
  OVERVIEW_TAB_ID,
  SloDetails,
  SloTabId,
} from '../../../pages/slo_details/components/slo_details';
import { SLOGroupings } from '../../../pages/slos/components/common/slo_groupings';

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

  const handleSelectedTab = (newTabId: SloTabId) => {
    setSelectedTabId(newTabId);
  };

  if (!slo) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.observability.sloOverviewDetails.h2.detailsLabel', {
              defaultMessage: '{sloName}',
              values: { sloName: slo.name },
            })}
          </h2>
        </EuiTitle>
        <SLOGroupings slo={slo} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <HeaderTitle slo={slo} isLoading={false} showTitle={false} />
        <SloDetails
          slo={slo}
          isAutoRefreshing={false}
          selectedTabId={selectedTabId}
          handleSelectedTab={handleSelectedTab}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="o11ySloOverviewDetailsCloseButton" onClick={onClose}>
              {i18n.translate('xpack.observability.sloOverviewDetails.button.closeLabel', {
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
              {i18n.translate('xpack.observability.sloOverviewDetails.button.detailsLabel', {
                defaultMessage: 'Details',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
