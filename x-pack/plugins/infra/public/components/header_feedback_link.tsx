/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHeaderSection, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';

interface InfraHeaderFeedbackLinkProps {
  url: string;
}

export const InfraHeaderFeedbackLink: React.SFC<InfraHeaderFeedbackLinkProps> = ({ url }) => (
  <VerticallyCenteredHeaderSection side="right">
    <EuiLink href={url} target="_blank" rel="noopener noreferrer">
      <FormattedMessage
        id="xpack.infra.headerFeedbackLink.feedbackText"
        defaultMessage="Feedback"
      />
    </EuiLink>
  </VerticallyCenteredHeaderSection>
);

const VerticallyCenteredHeaderSection = styled(EuiHeaderSection)`
  padding-left: ${props => props.theme.eui.euiSizeS};
  padding-right: ${props => props.theme.eui.euiSizeS};
  align-items: center;
`;
