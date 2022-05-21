/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiBadgeGroup,
  EuiBadge,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiText,
} from '@elastic/eui';
import styled from 'styled-components';
import { useBasePath } from '../../lib/kibana';
import { getIntegrationLink } from './helpers';
import { useInstalledIntegrations } from '../../../detections/containers/detection_engine/rules/use_installed_integrations';
import type {
  RelatedIntegration,
  RelatedIntegrationArray,
} from '../../../../common/detection_engine/schemas/common';

import * as i18n from '../../../detections/pages/detection_engine/rules/translations';

export interface IntegrationsPopoverProps {
  integrations: RelatedIntegrationArray;
}

const IntegrationsPopoverWrapper = styled(EuiFlexGroup)`
  width: 100%;
`;

const PopoverWrapper = styled(EuiBadgeGroup)`
  max-height: 400px;
  max-width: 368px;
  overflow: auto;
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
`;

const IntegrationListItem = styled('li')`
  list-style-type: disc;
  margin-left: 25px;
`;
/**
 * Component to render installed and available integrations
 * @param integrations - array of integrations to display
 */
const IntegrationsPopoverComponent = ({ integrations }: IntegrationsPopoverProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { data } = useInstalledIntegrations({ packages: [] });
  // const data = undefined; // To test with installed_integrations endpoint not implemented
  const basePath = useBasePath();

  const allInstalledIntegrations: RelatedIntegrationArray = data ?? [];
  const availableIntegrations: RelatedIntegrationArray = [];
  const installedIntegrations: RelatedIntegrationArray = [];

  integrations.forEach((i: RelatedIntegration) => {
    const match = allInstalledIntegrations.find(
      (installed) => installed.package === i.package && installed?.integration === i?.integration
    );
    if (match != null) {
      // TODO: Do version check
      installedIntegrations.push(match);
    } else {
      availableIntegrations.push(i);
    }
  });

  const badgeTitle =
    data != null
      ? `${installedIntegrations.length}/${integrations.length} ${i18n.INTEGRATIONS_BADGE}`
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
            iconType={'tag'}
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
        <EuiPopoverTitle data-test-subj={'IntegrationsDisplayPopoverTitle'}>
          {i18n.INTEGRATIONS_POPOVER_TITLE(integrations.length)}
        </EuiPopoverTitle>

        <PopoverWrapper data-test-subj={'IntegrationsDisplayPopoverWrapper'}>
          {data != null && (
            <>
              <EuiText size={'s'}>
                {i18n.INTEGRATIONS_POPOVER_DESCRIPTION_INSTALLED(installedIntegrations.length)}
              </EuiText>
              <ul>
                {installedIntegrations.map((integration, index) => (
                  <IntegrationListItem key={index}>
                    {getIntegrationLink(integration, basePath)}
                  </IntegrationListItem>
                ))}
              </ul>
            </>
          )}
          {availableIntegrations.length > 0 && (
            <>
              <EuiText size={'s'}>
                {i18n.INTEGRATIONS_POPOVER_DESCRIPTION_UNINSTALLED(availableIntegrations.length)}
              </EuiText>
              <ul>
                {availableIntegrations.map((integration, index) => (
                  <IntegrationListItem key={index}>
                    {getIntegrationLink(integration, basePath)}
                  </IntegrationListItem>
                ))}
              </ul>
            </>
          )}
        </PopoverWrapper>
      </EuiPopover>
    </IntegrationsPopoverWrapper>
  );
};

const MemoizedIntegrationsPopover = React.memo(IntegrationsPopoverComponent);
MemoizedIntegrationsPopover.displayName = 'IntegrationsPopover';

export const IntegrationsPopover =
  MemoizedIntegrationsPopover as typeof IntegrationsPopoverComponent;
