/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';

import * as i18n from '../translations';
import { ExceptionsPagination, FilterOptions } from '../types';
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
  filterOptions: FilterOptions;
  ruleSettingsUrl: string;
  onRefreshClick: () => void;
}

const ExceptionsViewerUtilityComponent = ({
  pagination,
  filterOptions,
  ruleSettingsUrl,
  onRefreshClick,
}: ExceptionsViewerUtilityProps): JSX.Element => {
  return (
    <MyUtilities alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText dataTestSubj="showingRules">
                {i18n.SHOWING_EXCEPTIONS(pagination.totalItemCount ?? 0)}
              </UtilityBarText>
            </UtilityBarGroup>

            <UtilityBarGroup>
              <UtilityBarAction iconSide="left" iconType="refresh" onClick={onRefreshClick}>
                {i18n.REFRESH}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StyledText size="s">
          {filterOptions.showEndpointList && (
            <FormattedMessage
              id="xpack.siem.exceptions.viewer.exceptionEndpointDetailsDescription"
              defaultMessage="All exceptions to this rule are applied to the endpoint and the detection rule. View {ruleSettings} for more details."
              values={{
                ruleSettings: (
                  <EuiLink href={ruleSettingsUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.siem.exceptions.viewer.exceptionEndpointDetailsDescription.ruleSettingsLink"
                      defaultMessage="rule settings"
                    />
                  </EuiLink>
                ),
              }}
            />
          )}
          {filterOptions.showDetectionsList && (
            <FormattedMessage
              id="xpack.siem.exceptions.viewer.exceptionDetectionDetailsDescription"
              defaultMessage="All exceptions to this rule are applied to the detection rule, not the endpoint. View {ruleSettings} for more details."
              values={{
                ruleSettings: (
                  <EuiLink href={ruleSettingsUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.siem.exceptions.viewer.exceptionDetectionDetailsDescription.ruleSettingsLink"
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
};

ExceptionsViewerUtilityComponent.displayName = 'ExceptionsViewerUtilityComponent';

export const ExceptionsViewerUtility = React.memo(ExceptionsViewerUtilityComponent);

ExceptionsViewerUtility.displayName = 'ExceptionsViewerUtility';
