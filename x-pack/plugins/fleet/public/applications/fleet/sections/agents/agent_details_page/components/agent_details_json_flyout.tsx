/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { Agent } from '../../../../types';
import { useStartServices } from '../../../../hooks';

export const AgentDetailsJsonFlyout = memo<{ agent: Agent; onClose: () => void }>(
  ({ agent, onClose }) => {
    const agentToJson = JSON.stringify(agent, null, 2);
    const agentName =
      typeof agent.local_metadata?.host?.hostname === 'string'
        ? agent.local_metadata.host.hostname
        : agent.id;

    const downloadJson = () => {
      const link = document.createElement('a');
      link.href = `data:text/json;charset=utf-8,${encodeURIComponent(agentToJson)}`;
      link.download = `${agentName}-agent-details.json`;
      link.click();
    };

    const { docLinks } = useStartServices();

    return (
      <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.fleet.agentDetails.jsonFlyoutTitle"
                defaultMessage="''{name}'' agent details"
                values={{
                  name: agentName,
                }}
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              <FormattedMessage
                id="xpack.fleet.agentDetails.jsonFlyoutDescription"
                defaultMessage="The JSON below is the raw agent data tracked by Fleet. This data can be useful for debugging or troubleshooting Elastic Agent. For more information, see the {doc}."
                values={{
                  doc: (
                    <EuiLink href={docLinks.links.fleet.troubleshooting}>
                      <FormattedMessage
                        id="xpack.fleet.agentDetails.jsonFlyoutDocLink"
                        defaultMessage="troubleshooting documentation"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
          <EuiSpacer />
          <EuiCodeBlock language="json" isCopyable>
            {agentToJson}
          </EuiCodeBlock>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.fleet.agentDetails.agentDetailsJsonFlyoutCloseButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="download" onClick={downloadJson}>
                <FormattedMessage
                  id="xpack.fleet.agentDetails.agentDetailsJsonDownloadButtonLabel"
                  defaultMessage="Download JSON"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
