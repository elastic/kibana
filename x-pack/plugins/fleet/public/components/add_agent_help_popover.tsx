/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import type { NoArgCallback } from '@elastic/eui';
import { EuiButton, EuiLink, EuiText, EuiPopover, EuiPopoverFooter } from '@elastic/eui';

import { useStartServices } from '../hooks';

export const AddAgentHelpPopover = ({
  button,
  isOpen,
  closePopover,
}: {
  button: ReactElement;
  isOpen: boolean;
  closePopover: NoArgCallback<void>;
}) => {
  const { docLinks } = useStartServices();
  return (
    <EuiPopover button={button} isOpen={isOpen} closePopover={closePopover}>
      <div style={{ width: '302px' }}>
        <EuiText size="m">
          <FormattedMessage
            id="xpack.fleet.addAgentHelpPopover.popoverBody"
            defaultMessage="For integrations to work successfully, add {elasticAgent} to your host to collect data and send it to Elastic Stack. {learnMoreLink}"
            values={{
              elasticAgent: <strong>Elastic Agent</strong>,
              learnMoreLink: (
                <EuiLink target="_blank" external href={docLinks.links.fleet.elasticAgent}>
                  <FormattedMessage
                    id="xpack.fleet.addAgentHelpPopover.documentationLink"
                    defaultMessage="Learn more about Elastic Agent."
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiButton onClick={closePopover} fullWidth size="s">
          Got it
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
