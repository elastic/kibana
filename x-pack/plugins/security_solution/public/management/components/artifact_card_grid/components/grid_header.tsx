/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { CardCompressedHeaderLayout, CardSectionPanel } from '../../artifact_entry_card';

const GridHeaderContainer = styled(CardSectionPanel)`
  padding-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
`;

export const GridHeader = memo(() => {
  return (
    <GridHeaderContainer>
      <CardCompressedHeaderLayout
        expanded={false}
        expandToggle={<div style={{ width: '24px' }} />}
        name={
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.artifactCardGrid.nameColumn"
                defaultMessage="Name"
              />
            </strong>
          </EuiText>
        }
        description={
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.artifactCardGrid.DescriptionColumn"
                defaultMessage="Description"
              />
            </strong>
          </EuiText>
        }
        effectScope={
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.artifactCardGrid.assignmentColumn"
                defaultMessage="Assignment"
              />
            </strong>
          </EuiText>
        }
        actionMenu={false}
      />
    </GridHeaderContainer>
  );
});
GridHeader.displayName = 'GridHeader';
