/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiBadge,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import styled from 'styled-components';
import { useKibana } from '../../../../../common/lib/kibana';
import { IntegrationDescription } from '../integrations_description';
import { getInstalledRelatedIntegrations } from '../utils';
import { useInstalledIntegrations } from '../use_installed_integrations';
import type { RelatedIntegrationArray } from '../../../../../../common/detection_engine/schemas/common';

import * as i18n from '../translations';

export interface IntegrationsPopoverProps {
  integrations: RelatedIntegrationArray;
}

const IntegrationsPopoverWrapper = styled(EuiFlexGroup)`
  width: 100%;
`;

const PopoverTitleWrapper = styled(EuiPopoverTitle)`
  max-width: 390px;
`;

const PopoverContentWrapper = styled('div')`
  max-height: 400px;
  max-width: 390px;
  overflow: auto;
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
`;

const IntegrationListItem = styled('li')`
  list-style-type: disc;
  margin-left: 25px;
  margin-bottom: 5px;
`;

/**
 * Component to render installed and available integrations
 * @param integrations - array of integrations to display
 */
const IntegrationsPopoverComponent = ({ integrations }: IntegrationsPopoverProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { data: allInstalledIntegrations } = useInstalledIntegrations({ packages: [] });
  const services = useKibana().services;
  const isSOMAvailable = services.application.capabilities.savedObjectsManagement.read;

  const integrationDetails = getInstalledRelatedIntegrations(
    integrations,
    allInstalledIntegrations
  );

  const totalRelatedIntegrationsInstalled = integrationDetails.filter((i) => i.is_enabled).length;
  const badgeTitle =
    allInstalledIntegrations != null && isSOMAvailable
      ? `${totalRelatedIntegrationsInstalled}/${integrations.length} ${i18n.INTEGRATIONS_BADGE}`
      : `${integrations.length} ${i18n.INTEGRATIONS_BADGE}`;

  return (
    <IntegrationsPopoverWrapper
      alignItems="center"
      gutterSize="s"
      data-test-subj={'IntegrationsWrapper'}
    >
      <EuiPopover
        ownFocus
        data-test-subj={'IntegrationsDisplayPopover'}
        button={
          <EuiBadge
            iconType={'package'}
            color="hollow"
            data-test-subj={'IntegrationsDisplayPopoverButton'}
            onClick={() => setPopoverOpen(!isPopoverOpen)}
            onClickAriaLabel={badgeTitle}
          >
            {badgeTitle}
          </EuiBadge>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <PopoverTitleWrapper data-test-subj={'IntegrationsPopoverTitle'}>
          {i18n.INTEGRATIONS_POPOVER_TITLE(integrations.length)}
        </PopoverTitleWrapper>
        <PopoverContentWrapper data-test-subj={'IntegrationsPopoverContentWrapper'}>
          <EuiText size={'s'}>{i18n.INTEGRATIONS_POPOVER_DESCRIPTION(integrations.length)}</EuiText>
          <EuiSpacer size={'s'} />
          <ul>
            {integrationDetails.map((integration, index) => (
              <IntegrationListItem key={`${integration.package_name}-${index}`}>
                <IntegrationDescription integration={integration} />
              </IntegrationListItem>
            ))}
          </ul>
        </PopoverContentWrapper>
      </EuiPopover>
    </IntegrationsPopoverWrapper>
  );
};

const MemoizedIntegrationsPopover = React.memo(IntegrationsPopoverComponent);
MemoizedIntegrationsPopover.displayName = 'IntegrationsPopover';

export const IntegrationsPopover =
  MemoizedIntegrationsPopover as typeof IntegrationsPopoverComponent;
