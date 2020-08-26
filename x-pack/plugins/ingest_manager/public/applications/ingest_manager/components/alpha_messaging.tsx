/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiLink } from '@elastic/eui';
import { AlphaFlyout } from './alpha_flyout';

const Message = styled(EuiText).attrs((props) => ({
  color: 'subdued',
  textAlign: 'center',
  size: 's',
}))`
  padding: ${(props) => props.theme.eui.paddingSizes.m};
  margin-top: auto;
`;

export const AlphaMessaging: React.FC<{}> = () => {
  const [isAlphaFlyoutOpen, setIsAlphaFlyoutOpen] = useState<boolean>(false);

  return (
    <>
      <Message>
        <p>
          <strong>
            <FormattedMessage
              id="xpack.ingestManager.alphaMessageTitle"
              defaultMessage="Beta release"
            />
          </strong>
          {' – '}
          <FormattedMessage
            id="xpack.ingestManager.alphaMessageDescription"
            defaultMessage="Ingest Manager is not
            recommended for production environments."
          />{' '}
          <EuiLink color="subdued" onClick={() => setIsAlphaFlyoutOpen(true)}>
            <FormattedMessage
              id="xpack.ingestManager.alphaMessageLinkText"
              defaultMessage="See more details."
            />
          </EuiLink>
        </p>
      </Message>
      {isAlphaFlyoutOpen && <AlphaFlyout onClose={() => setIsAlphaFlyoutOpen(false)} />}
    </>
  );
};
