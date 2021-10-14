/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { CommonProps, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { CardCompressedHeaderLayout, CardSectionPanel } from '../../artifact_entry_card';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';

const GridHeaderContainer = styled(CardSectionPanel)`
  padding-top: 0;
  padding-bottom: ${({ theme }) => theme.eui.paddingSizes.s};
`;

export type GridHeaderProps = Pick<CommonProps, 'data-test-subj'>;
export const GridHeader = memo<GridHeaderProps>(({ 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  const expandToggleElement = useMemo(
    () => <div data-test-subj={getTestId('expandCollapsePlaceHolder')} style={{ width: '24px' }} />,
    [getTestId]
  );

  return (
    <GridHeaderContainer data-test-subj={dataTestSubj}>
      <CardCompressedHeaderLayout
        expanded={false}
        expandToggle={expandToggleElement}
        data-test-subj={getTestId('layout')}
        flushTop={true}
        name={
          <EuiText size="xs" data-test-subj={getTestId('name')}>
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.artifactCardGrid.nameColumn"
                defaultMessage="Name"
              />
            </strong>
          </EuiText>
        }
        description={
          <EuiText size="xs" data-test-subj={getTestId('description')}>
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.artifactCardGrid.DescriptionColumn"
                defaultMessage="Description"
              />
            </strong>
          </EuiText>
        }
        effectScope={
          <EuiText size="xs" data-test-subj={getTestId('assignment')}>
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.artifactCardGrid.assignmentColumn"
                defaultMessage="Assignment"
              />
            </strong>
          </EuiText>
        }
        actionMenu={true}
      />
    </GridHeaderContainer>
  );
});
GridHeader.displayName = 'GridHeader';
