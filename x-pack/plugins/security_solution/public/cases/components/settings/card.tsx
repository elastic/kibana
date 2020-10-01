/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiCard, EuiIcon, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import { connectorsConfiguration } from '../../../common/lib/connectors/config';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';

interface ConnectorCardProps {
  connectorType: ConnectorTypes;
  title: string;
  listItems: Array<{ title: string; description: React.ReactNode }>;
}

const StyledText = styled(EuiText)`
  p {
    margin-bottom: 0 !important;
  }
`;

const ConnectorCardDisplay: React.FC<ConnectorCardProps> = ({
  connectorType,
  title,
  listItems,
}) => (
  <EuiCard
    layout="horizontal"
    icon={<EuiIcon size="xl" type={connectorsConfiguration[`${connectorType}`]?.logo ?? ''} />}
    title={title}
    display="plain"
    description={
      <StyledText size="s">
        {listItems.length > 0 &&
          listItems.map((item) => (
            <p>
              <strong>{`${item.title}: `}</strong>
              {item.description}
            </p>
          ))}
      </StyledText>
    }
  />
);

export const ConnectorCard = memo(ConnectorCardDisplay);
