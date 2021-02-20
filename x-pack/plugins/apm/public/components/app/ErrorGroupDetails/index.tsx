/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { useTrackPageview } from '../../../../../observability/public';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { useFetcher } from '../../../hooks/use_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { fontFamilyCode, fontSizes, px, units } from '../../../style/variables';
import { ApmHeader } from '../../shared/ApmHeader';
import { SearchBar } from '../../shared/search_bar';
import { DetailView } from './DetailView';
import { ErrorDistribution } from './Distribution';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';

const Titles = euiStyled.div`
  margin-bottom: ${px(units.plus)};
`;

const Label = euiStyled.div`
  margin-bottom: ${px(units.quarter)};
  font-size: ${fontSizes.small};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

const Message = euiStyled.div`
  font-family: ${fontFamilyCode};
  font-weight: bold;
  font-size: ${fontSizes.large};
  margin-bottom: ${px(units.half)};
`;

const Culprit = euiStyled.div`
  font-family: ${fontFamilyCode};
`;

function getShortGroupId(errorGroupId?: string) {
  if (!errorGroupId) {
    return NOT_AVAILABLE_LABEL;
  }

  return errorGroupId.slice(0, 5);
}

type ErrorGroupDetailsProps = RouteComponentProps<{
  groupId: string;
  serviceName: string;
}>;

export function ErrorGroupDetails({ location, match }: ErrorGroupDetailsProps) {
  const { serviceName, groupId } = match.params;
  const { urlParams, uiFilters } = useUrlParams();
  const { environment, start, end } = urlParams;

  const { data: errorGroupData } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/services/{serviceName}/errors/{groupId}',
          params: {
            path: {
              serviceName,
              groupId,
            },
            query: {
              environment,
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [environment, serviceName, start, end, groupId, uiFilters]
  );

  const { errorDistributionData } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId,
  });

  useTrackPageview({ app: 'apm', path: 'error_group_details' });
  useTrackPageview({ app: 'apm', path: 'error_group_details', delay: 15000 });

  if (!errorGroupData || !errorDistributionData) {
    return null;
  }

  // If there are 0 occurrences, show only distribution chart w. empty message
  const showDetails = errorGroupData.occurrencesCount !== 0;
  const logMessage = errorGroupData.error?.error.log?.message;
  const excMessage = errorGroupData.error?.error.exception?.[0].message;
  const culprit = errorGroupData.error?.error.culprit;
  const isUnhandled =
    errorGroupData.error?.error.exception?.[0].handled === false;

  return (
    <>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>
                {i18n.translate('xpack.apm.errorGroupDetails.errorGroupTitle', {
                  defaultMessage: 'Error group {errorGroupId}',
                  values: {
                    errorGroupId: getShortGroupId(groupId),
                  },
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          {isUnhandled && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="warning">
                {i18n.translate('xpack.apm.errorGroupDetails.unhandledLabel', {
                  defaultMessage: 'Unhandled',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </ApmHeader>
      <SearchBar />
      <EuiPage>
        <EuiPageBody>
          <EuiPanel>
            {showDetails && (
              <Titles>
                <EuiText>
                  {logMessage && (
                    <Fragment>
                      <Label>
                        {i18n.translate(
                          'xpack.apm.errorGroupDetails.logMessageLabel',
                          {
                            defaultMessage: 'Log message',
                          }
                        )}
                      </Label>
                      <Message>{logMessage}</Message>
                    </Fragment>
                  )}
                  <Label>
                    {i18n.translate(
                      'xpack.apm.errorGroupDetails.exceptionMessageLabel',
                      {
                        defaultMessage: 'Exception message',
                      }
                    )}
                  </Label>
                  <Message>{excMessage || NOT_AVAILABLE_LABEL}</Message>
                  <Label>
                    {i18n.translate(
                      'xpack.apm.errorGroupDetails.culpritLabel',
                      {
                        defaultMessage: 'Culprit',
                      }
                    )}
                  </Label>
                  <Culprit>{culprit || NOT_AVAILABLE_LABEL}</Culprit>
                </EuiText>
              </Titles>
            )}
            <ErrorDistribution
              distribution={errorDistributionData}
              title={i18n.translate(
                'xpack.apm.errorGroupDetails.occurrencesChartLabel',
                {
                  defaultMessage: 'Occurrences',
                }
              )}
            />
          </EuiPanel>
          <EuiSpacer size="s" />
          {showDetails && (
            <DetailView
              errorGroup={errorGroupData}
              urlParams={urlParams}
              location={location}
            />
          )}
        </EuiPageBody>
      </EuiPage>
    </>
  );
}
