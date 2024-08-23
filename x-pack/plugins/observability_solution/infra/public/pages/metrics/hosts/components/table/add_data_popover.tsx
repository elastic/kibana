/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';

export const AddDataPopover = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const addDataLinkHref = share.url.locators
    .get<ObservabilityOnboardingLocatorParams>(OBSERVABILITY_ONBOARDING_LOCATOR)
    ?.getRedirectUrl({ category: 'logs' });

  const troubleshootingLinkHref = 'https://ela.st/host-troubleshooting';

  const popoverContent = {
    title: i18n.translate('xpack.infra.addDataPopover.title', {
      defaultMessage: 'Want to see more?',
    }),
    content: i18n.translate('xpack.infra.addDataPopover.content', {
      defaultMessage: 'Understand host performance by collecting more metrics.',
    }),
    button: i18n.translate('xpack.infra.addDataPopover.button', {
      defaultMessage: 'Add data',
    }),
    link: i18n.translate('xpack.infra.addDataPopover.link', {
      defaultMessage: 'Troubleshooting',
    }),
  };

  const onButtonClick = () => setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiBadge
      color="hollow"
      iconType="iInCircle"
      iconSide="left"
      onClick={onButtonClick}
      onClickAriaLabel={popoverContent.title}
      iconOnClick={onButtonClick}
      iconOnClickAriaLabel={popoverContent.title}
    >
      {i18n.translate('xpack.infra.addDataPopover.naBadgeLabel', { defaultMessage: 'N/A' })}
    </EuiBadge>
  );

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiPopoverTitle>{popoverContent.title}</EuiPopoverTitle>
      <EuiText size="s" style={{ width: 300 }}>
        {popoverContent.content}
      </EuiText>
      <EuiPopoverFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              href={addDataLinkHref}
              data-test-subj="infraHostsTableWithoutSystemMetricsPopoverAddMoreButton"
            >
              {popoverContent.button}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiLink
                href={troubleshootingLinkHref}
                target="_blank"
                data-test-subj="infraHostsTableWithoutSystemMetricsPopoverTroubleshootingLink"
                external
              >
                {popoverContent.link}
              </EuiLink>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
