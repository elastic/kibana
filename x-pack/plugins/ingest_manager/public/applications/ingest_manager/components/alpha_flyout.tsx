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
              defaultMessage="This release is experimental and is not subject to the support SLA. It is designed for users to test and offer feedback about Ingest
            Manager and the new Elastic Agent. It is not intended for use in production environments since certain features may change or go away in a future release."
            />
          </p>
          <FormattedMessage
            id="xpack.ingestManager.alphaMessaging.feedbackText"
            defaultMessage="We encourage you to read our {docsLink} or to ask questions and send feedback in our {forumLink}."
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
          <p />

          <p>
            <FormattedMessage
              id="xpack.ingestManager.alphaMessaging.warningText"
              defaultMessage="{note}: you should not store important data with Ingest Manager
              since you will have limited visibility to it in a future release. This version uses an
              indexing strategy that will be deprecated in a future release and there is no migration
              path. Also, licensing for certain features is under consideration and may change in the future. As a result, you may lose access to certain features based on your license
              tier."
              values={{
                note: (
                  <strong>
                    <FormattedMessage
                      id="xpack.ingestManager.alphaMessaging.warningNote"
                      defaultMessage="Note"
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
            id="xpack.ingestManager.alphaMessging.closeFlyoutLabel"
            defaultMessage="Close"
          />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
