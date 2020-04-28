/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  onClose: () => void;
}

export const AlphaFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={640}>
      <EuiFlyoutHeader hasBorder aria-labelledby="AlphaMessagingFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="AlphaMessagingFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.alphaMessaging.flyoutTitle"
              defaultMessage="About this release"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="m">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.alphaMessaging.introText"
              defaultMessage="This Alpha release is designed for users to test and offer feedback on the new Ingest
            Manager and Elastic Agent. It is not intended for use in a production environments and
            these features are not officially supported. We encourage you to read our {docsLink} or to ask for help and other feedback in our {forumLink}."
              values={{
                docsLink: (
                  <EuiLink href="https://ela.st/ingest-manager-docs" external target="_blank">
                    <FormattedMessage
                      id="xpack.ingestManager.alphaMessaging.docsLink"
                      defaultMessage="documentation"
                    />
                  </EuiLink>
                ),
                forumLink: (
                  <EuiLink href="https://ela.st/ingest-manager-forum" external target="_blank">
                    <FormattedMessage
                      id="xpack.ingestManager.alphaMessaging.forumLink"
                      defaultMessage="Discuss forum"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>

          <p>
            <FormattedMessage
              id="xpack.ingestManager.alphaMessaging.warningText"
              defaultMessage="{note}: you should not store important data with Ingest Manager
              since you will have limited visibility to it in a future release. This version uses an
              indexing strategy that will be deprecated in the next release and there is no migration
              path. Also, the licensing for features is under consideration and may change before our
              GA release. As a result, you may lose access to certain features based on your license
              tier."
              values={{
                note: (
                  <strong>
                    <FormattedMessage
                      id="xpack.ingestManager.alphaMessaging.warningNote"
                      defaultMessage="Please note"
                    />
                  </strong>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.cancelButtonLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
