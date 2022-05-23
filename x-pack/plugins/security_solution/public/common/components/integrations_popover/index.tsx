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
  EuiIconTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { useBasePath } from '../../lib/kibana';
import { getInstalledRelatedIntegrations, getIntegrationLink } from './helpers';
import { useInstalledIntegrations } from '../../../detections/containers/detection_engine/rules/use_installed_integrations';
import type { RelatedIntegrationArray } from '../../../../common/detection_engine/schemas/common';

import * as i18n from '../../../detections/pages/detection_engine/rules/translations';

export interface IntegrationsPopoverProps {
  integrations: RelatedIntegrationArray;
}

const IntegrationsPopoverWrapper = styled(EuiFlexGroup)`
  width: 100%;
`;

const PopoverContentWrapper = styled('div')`
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
  const basePath = useBasePath();

  const allInstalledIntegrations: RelatedIntegrationArray = data ?? [];
  const { availableIntegrations, installedRelatedIntegrations } = getInstalledRelatedIntegrations(
    integrations,
    allInstalledIntegrations
  );

  const badgeTitle =
    data != null
      ? `${installedRelatedIntegrations.length}/${integrations.length} ${i18n.INTEGRATIONS_BADGE}`
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
        <EuiPopoverTitle data-test-subj={'IntegrationsPopoverTitle'}>
          {i18n.INTEGRATIONS_POPOVER_TITLE(integrations.length)}
        </EuiPopoverTitle>

        <PopoverContentWrapper data-test-subj={'IntegrationsPopoverContentWrapper'}>
          {data != null && (
            <>
              <EuiText size={'s'}>
                {i18n.INTEGRATIONS_POPOVER_DESCRIPTION_INSTALLED(
                  installedRelatedIntegrations.length
                )}
              </EuiText>
              <ul>
                {installedRelatedIntegrations.map((integration, index) => (
                  <IntegrationListItem key={index}>
                    {getIntegrationLink(integration, basePath)}
                    {!integration?.versionSatisfied && (
                      <EuiIconTip
                        type="alert"
                        content={i18n.INTEGRATIONS_INSTALLED_VERSION_TOOLTIP(
                          integration.version,
                          integration.targetVersion
                        )}
                        position="right"
                      />
                    )}
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
        </PopoverContentWrapper>
      </EuiPopover>
    </IntegrationsPopoverWrapper>
  );
};

const MemoizedIntegrationsPopover = React.memo(IntegrationsPopoverComponent);
MemoizedIntegrationsPopover.displayName = 'IntegrationsPopover';

export const IntegrationsPopover =
  MemoizedIntegrationsPopover as typeof IntegrationsPopoverComponent;
