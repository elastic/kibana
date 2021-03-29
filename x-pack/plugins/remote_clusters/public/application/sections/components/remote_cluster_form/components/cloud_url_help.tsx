/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiIcon, EuiLink, EuiPopover, EuiText } from '@elastic/eui';

export const CloudUrlHelp: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
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
      <EuiText>
        <h6>
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.popoverTitle"
            defaultMessage="How to find your Elasticsearch endpoint url?"
          />
        </h6>
        <ol>
          <li>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.stepOneText"
              defaultMessage="Open {deploymentsLink}"
              values={{
                deploymentsLink: (
                  <EuiLink external={true} href="test.com">
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelpModal.deploymentsLink"
                      defaultMessage="Deployments overview."
                    />
                  </EuiLink>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.stepTwoText"
              defaultMessage="Select the remote deployment."
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cloudUrlHelp.stepThreeText"
              defaultMessage="Copy {elasticsearch} endpoint URL under Applications."
              values={{
                elasticsearch: (
                  <>
                    <EuiIcon className="eui-alignBaseline" type="logoElasticsearch" />
                    <strong> Elasticsearch</strong>
                  </>
                ),
              }}
            />
          </li>
        </ol>
      </EuiText>
    </EuiPopover>
  );
};
