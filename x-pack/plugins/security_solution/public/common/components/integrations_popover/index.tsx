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
  EuiLink,
} from '@elastic/eui';
import styled from 'styled-components';
import type { RelatedIntegrationArray } from '../../../../common/detection_engine/schemas/common';

import * as i18n from '../../../detections/pages/detection_engine/rules/translations';

export interface IntegrationsPopoverProps {
  integrations: RelatedIntegrationArray;
  installedIntegrations: RelatedIntegrationArray;
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

/**
 * Component to render installed and available integrations
 * @param integrations - array of items to render
 * @param installedIntegrations - array of items to render
 */
const IntegrationsPopoverComponent = ({
  integrations,
  installedIntegrations,
}: IntegrationsPopoverProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const integrationsTitle = `${installedIntegrations.length}/${integrations.length} ${i18n.INTEGRATIONS_BADGE}`;

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
            onClickAriaLabel={integrationsTitle}
          >
            {integrationsTitle}
          </EuiBadge>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverOpen(!isPopoverOpen)}
        repositionOnScroll
      >
        <EuiPopoverTitle data-test-subj={'IntegrationsDisplayPopoverTitle'}>
          {i18n.INTEGRATIONS_POPOVER_TITLE(3)}
        </EuiPopoverTitle>

        <PopoverWrapper data-test-subj={'IntegrationsDisplayPopoverWrapper'}>
          <EuiText size={'s'}>{i18n.INTEGRATIONS_POPOVER_DESCRIPTION_INSTALLED(1)}</EuiText>
          <EuiLink href={'integrationURL'} target="_blank">
            {'AWS CloudTrail'}
          </EuiLink>
          <EuiText size={'s'}>{i18n.INTEGRATIONS_POPOVER_DESCRIPTION_UNINSTALLED(2)}</EuiText>
          <div>
            <EuiLink href={'integrationURL'} target="_blank">
              {'Endpoint Security'}
            </EuiLink>
          </div>
          <div>
            <EuiLink href={'integrationURL'} target="_blank">
              {'\nModSecurity Audit'}
            </EuiLink>
          </div>
        </PopoverWrapper>
      </EuiPopover>
    </IntegrationsPopoverWrapper>
  );
};

const MemoizedIntegrationsPopover = React.memo(IntegrationsPopoverComponent);
MemoizedIntegrationsPopover.displayName = 'IntegrationsPopover';

export const IntegrationsPopover =
  MemoizedIntegrationsPopover as typeof IntegrationsPopoverComponent;
