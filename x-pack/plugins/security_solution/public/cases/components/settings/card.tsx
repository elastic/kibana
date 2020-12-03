/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { EuiCard, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';

import { connectorsConfiguration } from '../connectors';
import { ConnectorTypes } from '../../../../../case/common/api/connectors';

interface ConnectorCardProps {
  connectorType: ConnectorTypes;
  title: string;
  listItems: Array<{ title: string; description: React.ReactNode }>;
  isLoading: boolean;
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
  isLoading,
}) => {
  const description = useMemo(
    () => (
      <StyledText>
        {listItems.length > 0 &&
          listItems.map((item, i) => (
            <span data-test-subj="card-list-item" key={`${item.title}-${i}`}>
              <strong>{`${item.title}: `}</strong>
              {item.description}
            </span>
          ))}
      </StyledText>
    ),
    [listItems]
  );
  const icon = useMemo(
    () => <EuiIcon size="xl" type={connectorsConfiguration[`${connectorType}`]?.logo ?? ''} />,
    [connectorType]
  );
  return (
    <>
      {isLoading && <EuiLoadingSpinner data-test-subj="settings-connector-card-loading" />}
      {!isLoading && (
        <EuiCard
          data-test-subj={`settings-connector-card`}
          description={description}
          display="plain"
          icon={icon}
          layout="horizontal"
          paddingSize="none"
          title={title}
          titleSize="xs"
        />
      )}
    </>
  );
};

export const ConnectorCard = memo(ConnectorCardDisplay);
