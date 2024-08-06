/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { EuiButtonWithTooltip } from '../../../../../components';

interface AddIntegrationButtonProps {
  userCanInstallPackages?: boolean;
  missingSecurityConfiguration: boolean;
  packageName: string;
  isStandaloneUser?: boolean;
  href: string;
  onClick: Function;
}

export function AddIntegrationButton(props: AddIntegrationButtonProps) {
  const { userCanInstallPackages, missingSecurityConfiguration, packageName, href, onClick } =
    props;

  const tooltip = !userCanInstallPackages
    ? {
        content: missingSecurityConfiguration ? (
          <FormattedMessage
            id="xpack.fleet.epm.addPackagePolicyButtonSecurityRequiredTooltip"
            defaultMessage="To add Elastic Agent Integrations, you must have security enabled and have the All privilege for Fleet. Contact your administrator."
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.epm.addPackagePolicyButtonPrivilegesRequiredTooltip"
            defaultMessage="Elastic Agent Integrations require the All privilege for Fleet and All privilege for Integrations. Contact your administrator."
          />
        ),
      }
    : undefined;

  const [isPopoverOpen, setPopover] = useState(false);
  const smallContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'smallContextMenuPopover',
  });

  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const currentUrl = window.location.href;

  // replace last path segment with 'configs'
  const url = currentUrl.replace(/[^/]+$/, 'configs');

  const items = [
    <EuiContextMenuItem key="share" icon="plusInCircle" href={url}>
      Add to existing standalone agent
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="share" icon="plusInCircle" href={url + '?tab=k8s'}>
      Add to standalone agent on Kubernetes
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="fleet" icon="plusInCircle" href={href}>
      Add to Fleet policy
    </EuiContextMenuItem>,
  ];

  const button = (
    <EuiButton fill iconType="arrowDown" iconSide="right" onClick={onButtonClick}>
      <FormattedMessage
        id="xpack.fleet.epm.addPackagePolicyButtonText"
        defaultMessage="Add {packageName}"
        values={{
          packageName,
        }}
      />
    </EuiButton>
  );

  return (
    <EuiPopover
      id={smallContextMenuPopoverId}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel size="s" items={items} />
    </EuiPopover>
  );
}
