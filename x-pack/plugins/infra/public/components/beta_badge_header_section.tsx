/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBetaBadge, EuiHeaderSection } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';

interface BetaBadgeHeaderSectionProps {
  tooltipContent?: React.ReactNode;
}

export const BetaBadgeHeaderSection: React.SFC<BetaBadgeHeaderSectionProps> = ({
  tooltipContent = (
    <FormattedMessage
      id="xpack.infra.betaBadgeHeaderSection.betaBadgeHeaderSectionDefaultTooltip"
      defaultMessage="Please help us improve by reporting issues or bugs in the Kibana repo."
    />
  ),
}) => (
  <VerticallyCenteredHeaderSection side="right">
    <EuiBetaBadge
      label={
        <FormattedMessage id="xpack.infra.betaBadgeHeaderSection.betaLabel" defaultMessage="Beta" />
      }
      tooltipContent={tooltipContent}
    />
  </VerticallyCenteredHeaderSection>
);

export const InfrastructureBetaBadgeHeaderSection = () => (
  <BetaBadgeHeaderSection
    tooltipContent={
      <FormattedMessage
        id="xpack.infra.betaBadgeHeaderSection.infrastructureUiIsStillInBetaTooltip"
        defaultMessage="The Infrastructure UI is still in beta. Please help us improve by reporting issues or bugs in the Kibana repo."
      />
    }
  />
);

export const LogsBetaBadgeHeaderSection = () => (
  <BetaBadgeHeaderSection
    tooltipContent={
      <FormattedMessage
        id="xpack.infra.betaBadgeHeaderSection.logsUiIsStillInBetaTooltip"
        defaultMessage="The Logs UI is still in beta. Please help us improve by reporting issues or bugs in the Kibana repo."
      />
    }
  />
);

const VerticallyCenteredHeaderSection = styled(EuiHeaderSection)`
  padding-left: ${props => props.theme.eui.euiSizeS};
  padding-right: ${props => props.theme.eui.euiSizeS};
  align-items: center;
`;
