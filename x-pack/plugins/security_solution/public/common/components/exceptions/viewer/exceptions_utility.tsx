/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

import * as i18n from '../translations';
import { ExceptionsPagination } from '../types';
import {
  UtilityBar,
  UtilityBarSection,
  UtilityBarGroup,
  UtilityBarText,
  UtilityBarAction,
} from '../../utility_bar';

const StyledText = styled(EuiText)`
  font-style: italic;
`;

const MyUtilities = styled(EuiFlexGroup)`
  height: 50px;
`;

interface ExceptionsViewerUtilityProps {
  pagination: ExceptionsPagination;
  showEndpointListsOnly: boolean;
  showDetectionsListsOnly: boolean;
  ruleSettingsUrl: string;
  onRefreshClick: () => void;
}

const ExceptionsViewerUtilityComponent: React.FC<ExceptionsViewerUtilityProps> = ({
  pagination,
  showEndpointListsOnly,
  showDetectionsListsOnly,
  ruleSettingsUrl,
  onRefreshClick,
}): JSX.Element => (
  <MyUtilities alignItems="center" justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <UtilityBar>
        <UtilityBarSection>
          <UtilityBarGroup>
            <UtilityBarText dataTestSubj="exceptionsShowing">
              {i18n.SHOWING_EXCEPTIONS(pagination.totalItemCount ?? 0)}
            </UtilityBarText>
          </UtilityBarGroup>

          <UtilityBarGroup>
            <UtilityBarAction
              dataTestSubj="exceptionsRefresh"
              iconSide="left"
              iconType="refresh"
              onClick={onRefreshClick}
            >
              {i18n.REFRESH}
            </UtilityBarAction>
          </UtilityBarGroup>
        </UtilityBarSection>
      </UtilityBar>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <StyledText size="s">
        {showEndpointListsOnly && (
          <FormattedMessage
            id="xpack.securitySolution.exceptions.viewer.exceptionEndpointDetailsDescription"
            defaultMessage="All exceptions to this rule are applied to the endpoint and the detection rule. View {ruleSettings} for more details."
            data-test-subj="exceptionsEndpointMessage"
            values={{
              ruleSettings: (
                <EuiLink href={ruleSettingsUrl} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.exceptions.viewer.exceptionEndpointDetailsDescription.ruleSettingsLink"
                    defaultMessage="rule settings"
                  />
                </EuiLink>
              ),
            }}
          />
        )}
        {showDetectionsListsOnly && (
          <FormattedMessage
            id="xpack.securitySolution.exceptions.viewer.exceptionDetectionDetailsDescription"
            defaultMessage="All exceptions to this rule are applied to the detection rule, not the endpoint. View {ruleSettings} for more details."
            data-test-subj="exceptionsDetectionsMessage"
            values={{
              ruleSettings: (
                <EuiLink href={ruleSettingsUrl} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.exceptions.viewer.exceptionDetectionDetailsDescription.ruleSettingsLink"
                    defaultMessage="rule settings"
                  />
                </EuiLink>
              ),
            }}
          />
        )}
      </StyledText>
    </EuiFlexItem>
  </MyUtilities>
);

ExceptionsViewerUtilityComponent.displayName = 'ExceptionsViewerUtilityComponent';

export const ExceptionsViewerUtility = React.memo(ExceptionsViewerUtilityComponent);

ExceptionsViewerUtility.displayName = 'ExceptionsViewerUtility';
