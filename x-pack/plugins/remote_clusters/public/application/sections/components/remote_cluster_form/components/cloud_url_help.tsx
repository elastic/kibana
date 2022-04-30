/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { useAppContext } from '../../../../app_context';

export const CloudUrlHelp: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { cloudBaseUrl } = useAppContext();
  return (
    <EuiPopover
      button={
        <EuiText size="xs">
          <EuiLink
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.buttonLabel"
              defaultMessage="Need help?"
            />
          </EuiLink>
        </EuiText>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.popoverTitle"
          defaultMessage="How to find your Elasticsearch endpoint URL"
        />
      </EuiPopoverTitle>
      <EuiText size="s" style={{ maxWidth: 500 }}>
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.stepOneText"
          defaultMessage="Open the {deploymentsLink}, select the remote deployment and copy the {elasticsearch} endpoint URL."
          values={{
            deploymentsLink: (
              <EuiLink external={true} href={`${cloudBaseUrl}/deployments`} target="_blank">
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelpModal.deploymentsLink"
                  defaultMessage="deployments page"
                />
              </EuiLink>
            ),
            elasticsearch: <strong> Elasticsearch</strong>,
          }}
        />
      </EuiText>
    </EuiPopover>
  );
};
