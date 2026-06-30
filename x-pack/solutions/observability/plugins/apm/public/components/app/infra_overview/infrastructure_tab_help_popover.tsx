/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { HelpPopover, HelpPopoverButton } from '../help_popover/help_popover';

export function InfrastructureTabHelpPopover() {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { docLinks } = useApmPluginContext().core;

  return (
    <HelpPopover
      anchorPosition="leftUp"
      button={
        <EuiToolTip
          content={
            <span data-test-subj="apmInfrastructureTabHelpPopoverTooltipContent">
              {i18n.translate('xpack.apm.infraOverview.helpPopover.tooltipContent', {
                defaultMessage: 'Infrastructure tab information',
              })}
            </span>
          }
        >
          <HelpPopoverButton
            onClick={() => {
              setIsPopoverOpen((prevIsPopoverOpen) => !prevIsPopoverOpen);
            }}
          />
        </EuiToolTip>
      }
      closePopover={() => setIsPopoverOpen(false)}
      isOpen={isPopoverOpen}
    >
      <p data-test-subj="apmInfrastructureTabHelpPopoverContent">
        <FormattedMessage
          id="xpack.apm.infraOverview.helpPopover.supportedInfrastructureDescription"
          defaultMessage="Shows containers, pods, and hosts that the selected service is linked to. The data sources and navigation behavior depend on whether the service is instrumented with Elastic APM or OpenTelemetry (OTel)."
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.apm.infraOverview.helpPopover.documentationDescription"
          defaultMessage="See {documentationLink} for more information"
          values={{
            documentationLink: (
              <EuiLink
                data-test-subj="apmInfrastructureTabHelpPopoverDocumentationLink"
                href={docLinks.links.apm.infrastructureTab}
                target="_blank"
              >
                {i18n.translate('xpack.apm.infraOverview.helpPopover.documentationLinkText', {
                  defaultMessage: 'documentation',
                })}
              </EuiLink>
            ),
          }}
        />
      </p>
    </HelpPopover>
  );
}
