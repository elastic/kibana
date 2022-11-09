/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  EuiPopover,
  EuiBadge,
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import type { RelatedIntegrationArray } from '../../../../../../common/detection_engine/rule_schema';
import { IntegrationDescription } from '../integrations_description';
import { useRelatedIntegrations } from '../use_related_integrations';

import * as i18n from '../translations';

export interface IntegrationsPopoverProps {
  relatedIntegrations: RelatedIntegrationArray;
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
const IntegrationsPopoverComponent = ({ relatedIntegrations }: IntegrationsPopoverProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { integrations, isLoaded } = useRelatedIntegrations(relatedIntegrations);

  const enabledIntegrations = useMemo(() => {
    return integrations.filter(
      (i) => i.installationStatus.isKnown && i.installationStatus.isEnabled
    );
  }, [integrations]);

  const numIntegrations = integrations.length;
  const numIntegrationsEnabled = enabledIntegrations.length;

  const badgeTitle = useMemo(() => {
    return isLoaded
      ? `${numIntegrationsEnabled}/${numIntegrations} ${i18n.INTEGRATIONS_BADGE}`
      : `${numIntegrations} ${i18n.INTEGRATIONS_BADGE}`;
  }, [isLoaded, numIntegrations, numIntegrationsEnabled]);

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
          {i18n.INTEGRATIONS_POPOVER_TITLE(numIntegrations)}
        </PopoverTitleWrapper>
        <PopoverContentWrapper data-test-subj={'IntegrationsPopoverContentWrapper'}>
          <EuiText size={'s'}>{i18n.INTEGRATIONS_POPOVER_DESCRIPTION(numIntegrations)}</EuiText>
          <EuiSpacer size={'s'} />
          <ul>
            {integrations.map((integration, index) => (
              <IntegrationListItem key={`${integration.packageName}-${index}`}>
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
