/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiLink,
  EuiText,
  EuiTitle,
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
              defaultMessage="Ingest Manager is under active development and is not intended for use in production environments. This beta release is designed for users to test and offer feedback about Ingest
            Manager and the new Elastic Agent. This plugin is not subject to the support SLA."
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.ingestManager.alphaMessaging.feedbackText"
              defaultMessage="Read our {docsLink} or go to our {forumLink} for questions or feedback."
              values={{
                docsLink: (
                  <EuiLink
                    href="https://www.elastic.co/guide/en/ingest-management/current/index.html"
                    external
                    target="_blank"
                  >
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
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} flush="left">
          <FormattedMessage
            id="xpack.ingestManager.alphaMessging.closeFlyoutLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
