/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';

import { useFormContext } from 'react-hook-form';
import { LiveQuery } from '../../live_queries';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  &.euiFlyoutHeader {
    padding-top: 21px;
    padding-bottom: 20px;
  }
`;

interface PlaygroundFlyoutProps {
  enabled?: boolean;
  onClose: () => void;
}

const PlaygroundFlyoutComponent: React.FC<PlaygroundFlyoutProps> = ({ enabled, onClose }) => {
  // @ts-expect-error update types
  const { serializer, watch } = useFormContext();
  const watchedValues = watch();
  const { query, ecs_mapping: ecsMapping, id } = watchedValues;
  /* recalculate the form data when ecs_mapping changes */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const serializedFormData = useMemo(() => serializer(watchedValues), [ecsMapping]);

  return (
    <EuiFlyout type="push" size="m" onClose={onClose}>
      <StyledEuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h5>
            <FormattedMessage
              id="xpack.osquery.queryPlaygroundFlyout.title"
              defaultMessage="Test query"
            />
          </h5>
        </EuiTitle>
      </StyledEuiFlyoutHeader>
      <EuiFlyoutBody>
        <LiveQuery
          enabled={enabled && query !== ''}
          formType="simple"
          query={query}
          ecs_mapping={serializedFormData.ecs_mapping}
          savedQueryId={id}
          queryField={false}
          ecsMappingField={false}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const PlaygroundFlyout = React.memo(PlaygroundFlyoutComponent);
