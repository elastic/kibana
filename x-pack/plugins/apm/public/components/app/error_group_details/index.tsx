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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { useFetcher } from '../../../hooks/use_fetcher';
import { DetailView } from './detail_view';
import { ErrorDistribution } from './Distribution';

const Titles = euiStyled.div`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeL};
`;

const Label = euiStyled.div`
  margin-bottom: ${({ theme }) => theme.eui.euiSizeXS};
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  color: ${({ theme }) => theme.eui.euiColorDarkShade};
`;

const Message = euiStyled.div`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
  font-weight: bold;
  font-size: ${({ theme }) => theme.eui.euiFontSizeM};
  margin-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

const Culprit = euiStyled.div`
  font-family: ${({ theme }) => theme.eui.euiCodeFontFamily};
`;

function getShortGroupId(errorGroupId?: string) {
  if (!errorGroupId) {
    return NOT_AVAILABLE_LABEL;
  }

  return errorGroupId.slice(0, 5);
}

function ErrorGroupHeader({
  groupId,
  isUnhandled,
}: {
  groupId: string;
  isUnhandled?: boolean;
}) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.apm.errorGroupDetails.errorGroupTitle', {
              defaultMessage: 'Error group {errorGroupId}',
              values: {
                errorGroupId: getShortGroupId(groupId),
              },
            })}
          </h2>
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
  );
}

export function ErrorGroupDetails() {
  const { urlParams } = useUrlParams();
  const { environment, kuery, start, end } = urlParams;
  const { serviceName } = useApmServiceContext();

  const apmRouter = useApmRouter();

  const {
    path: { groupId },
  } = useApmParams('/services/:serviceName/errors/:groupId');

  useBreadcrumb({
    title: groupId,
    href: apmRouter.link('/services/:serviceName/errors/:groupId', {
      path: {
        serviceName,
        groupId,
      },
    }),
  });

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
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, groupId]
  );

  const { errorDistributionData } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId,
  });

  if (!errorGroupData || !errorDistributionData) {
    return <ErrorGroupHeader groupId={groupId} />;
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
      <EuiSpacer size={'s'} />

      <ErrorGroupHeader groupId={groupId} isUnhandled={isUnhandled} />

      <EuiSpacer size={'m'} />

      <EuiPanel hasBorder={true}>
        {showDetails && (
          <Titles>
            <EuiText>
              {logMessage && (
                <>
                  <Label>
                    {i18n.translate(
                      'xpack.apm.errorGroupDetails.logMessageLabel',
                      {
                        defaultMessage: 'Log message',
                      }
                    )}
                  </Label>
                  <Message>{logMessage}</Message>
                </>
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
                {i18n.translate('xpack.apm.errorGroupDetails.culpritLabel', {
                  defaultMessage: 'Culprit',
                })}
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
        <DetailView errorGroup={errorGroupData} urlParams={urlParams} />
      )}
    </>
  );
}
