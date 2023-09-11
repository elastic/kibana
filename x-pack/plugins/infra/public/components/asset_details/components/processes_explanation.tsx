/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useDateRangeProviderContext } from '../hooks/use_date_range';
import { Popover } from '../tabs/common/popover';

const DOCUMENTATION_LINK =
  'https://www.elastic.co/guide/en/observability/current/view-infrastructure-metrics.html';
const SYSTEM_INTEGRATION_DOCS_LINK = 'https://docs.elastic.co/en/integrations/system';

const ProcessesExplanationTooltipContent = React.memo(() => {
  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <EuiText size="s" onClick={onClick} style={{ width: 300 }}>
      <p>
        <FormattedMessage
          id="xpack.infra.assetDetails.processes.tooltip.explanationLabel"
          defaultMessage="The processes listed are based on an aggregation of the top CPU and the top memory consuming processes for the 1 minute preceding the end date of the selected time period. The number of top processes is configurable in the {systemIntegration}."
          values={{
            systemIntegration: (
              <EuiLink
                data-test-subj="infraAssetDetailsTooltipSystemIntegrationDocumentationLink"
                href={SYSTEM_INTEGRATION_DOCS_LINK}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.infra.assetDetails.processes.tooltip.systemIntegrationDocumentationLink"
                  defaultMessage="System Integration"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.infra.assetDetails.processes.tooltip.documentationLabel"
          defaultMessage="Please see the following {documentation} for more details on processes."
          values={{
            documentation: (
              <EuiLink
                data-test-subj="infraAssetDetailsTooltipDocumentationLink"
                href={DOCUMENTATION_LINK}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.infra.assetDetails.processes.tooltip.documentationLink"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
});

export const ProcessesExplanationMessage = () => {
  const { getDateRangeInTimestamp } = useDateRangeProviderContext();
  const dateFromRange = new Date(getDateRangeInTimestamp().to);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="baseline">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.infra.assetDetails.overview.processesSectionTitle"
            defaultMessage="Showing process data collected for the 1 minute preceding {date} @ {time}"
            values={{
              date: (
                <FormattedDate value={dateFromRange} month="short" day="numeric" year="numeric" />
              ),
              time: (
                <FormattedTime
                  value={dateFromRange}
                  hour12={false}
                  hour="2-digit"
                  minute="2-digit"
                  second="2-digit"
                />
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Popover
          iconSize="s"
          iconColor="subdued"
          icon="iInCircle"
          panelPaddingSize="m"
          data-test-subj="infraAssetDetailsProcessesPopoverButton"
        >
          <ProcessesExplanationTooltipContent />
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
