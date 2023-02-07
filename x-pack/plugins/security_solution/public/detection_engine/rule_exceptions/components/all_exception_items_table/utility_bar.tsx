/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiButtonGroup, EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

import { FormattedMessage } from '@kbn/i18n-react';
import type { ExceptionsPagination } from '../../utils/types';
import {
  UtilityBar,
  UtilityBarSection,
  UtilityBarGroup,
  UtilityBarText,
} from '../../../../common/components/utility_bar';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import * as i18n from './translations';

const StyledText = styled.span`
  font-weight: bold;
`;

const MyUtilities = styled.div`
  height: 50px;
`;

const StyledBarGroup = styled(EuiFlexGroup)`
  align-items: center;
`;

const PaginationUtilityBarText = styled(UtilityBarText)`
  align-self: center;
`;

interface ExceptionsViewerUtilityProps {
  pagination: ExceptionsPagination;
  // Corresponds to last time exception items were fetched
  lastUpdated: string | number;
  exceptionsToShow: { [id: string]: boolean };
  onChangeExceptionsToShow: (optionId: string) => void;
}

/**
 * Utilities include exception item counts and group by options
 */
const ExceptionsViewerUtilityComponent: React.FC<ExceptionsViewerUtilityProps> = ({
  pagination,
  lastUpdated,
  exceptionsToShow,
  onChangeExceptionsToShow,
}): JSX.Element => {
  return (
    <MyUtilities>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <PaginationUtilityBarText dataTestSubj="exceptionsShowing">
              <FormattedMessage
                id="xpack.securitySolution.exceptions.viewer.paginationDetails"
                defaultMessage="Showing {partOne} of {partTwo}"
                values={{
                  partOne: (
                    <StyledText>{`${pagination.totalItemCount === 0 ? '0' : '1'}-${Math.min(
                      pagination.pageSize,
                      pagination.totalItemCount
                    )}`}</StyledText>
                  ),
                  partTwo: <StyledText>{`${pagination.totalItemCount}`}</StyledText>,
                }}
              />
            </PaginationUtilityBarText>
          </UtilityBarGroup>
        </UtilityBarSection>
        <UtilityBarSection>
          <StyledBarGroup>
            <UtilityBarText dataTestSubj="lastUpdated">
              <EuiText size="s" data-test-subj="exceptionsViewerLastUpdated">
                <FormattedMessage
                  id="xpack.securitySolution.exceptions.viewer.lastUpdated"
                  defaultMessage="Updated {updated}"
                  values={{
                    updated: <FormattedRelativePreferenceDate value={lastUpdated} />,
                  }}
                />
              </EuiText>
            </UtilityBarText>
            <EuiButtonGroup
              legend="Displayed exceptions button group"
              options={[
                {
                  id: `active`,
                  label: i18n.ACTIVE_EXCEPTIONS,
                },
                {
                  id: `expired`,
                  label: i18n.EXPIRED_EXCEPTIONS,
                },
              ]}
              idToSelectedMap={exceptionsToShow}
              onChange={onChangeExceptionsToShow}
              type="multi"
            />
          </StyledBarGroup>
        </UtilityBarSection>
      </UtilityBar>
    </MyUtilities>
  );
};

ExceptionsViewerUtilityComponent.displayName = 'ExceptionsViewerUtilityComponent';

export const ExceptionsViewerUtility = React.memo(ExceptionsViewerUtilityComponent);

ExceptionsViewerUtility.displayName = 'ExceptionsViewerUtility';
