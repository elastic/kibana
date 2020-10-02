/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import styled from 'styled-components';

import { connectorsConfiguration } from '../../../common/lib/connectors/config';

interface ConnectorCardProps {
  connectorType: string;
  title: string;
  listItems: Array<{ title: string; description: React.ReactNode }>;
}

const StyledText = styled.span`
  span {
    display: block;
  }
`;

const ConnectorCardDisplay: React.FC<ConnectorCardProps> = ({
  connectorType,
  title,
  listItems,
}) => {
  const description = useMemo(
    () => (
      <StyledText>
        {Array.isArray(listItems) &&
          listItems.length > 0 &&
          listItems.map((item, i) => (
            <span key={`${item.title}-${i}`}>
              <strong>{`${item.title}: `}</strong>
              {item.description}
            </span>
          ))}
      </StyledText>
    ),
    [listItems]
  );
  const icon = useMemo(
    () => <EuiIcon size="l" type={connectorsConfiguration[`${connectorType}`]?.logo ?? ''} />,
    [connectorType]
  );
  return (
    <EuiCard
      data-test-subj="settings-connector-card"
      display="plain"
      description={description}
      icon={icon}
      layout="horizontal"
      title={title}
      titleSize="xs"
      paddingSize="none"
    />
  );
};

export const ConnectorCard = memo(ConnectorCardDisplay);
