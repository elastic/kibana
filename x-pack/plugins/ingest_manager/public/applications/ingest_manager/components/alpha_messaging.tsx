/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiText } from '@elastic/eui';

const Message = styled(EuiText)`
  padding: ${props => props.theme.eui.paddingSizes.m};
`;

Message.defaultProps = {
  color: 'subdued',
  textAlign: 'center',
};

export const AlphaMessaging: React.FC<{}> = () => (
  <Message>
    <p>
      <small>
        <strong>Alpha release</strong> – Ingest Manager is under active development and is not
        intended for production purposes.
      </small>
    </p>
  </Message>
);
