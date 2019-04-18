/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { idx } from '../../../../common/idx';
import { useFetcher } from '../../../hooks/useFetcher';
import {
  loadErrorDistribution,
  loadErrorGroupDetails
} from '../../../services/rest/apm/error_groups';
import { IUrlParams } from '../../../store/urlParams';
import { fontFamilyCode, fontSizes, px, units } from '../../../style/variables';
// @ts-ignore
import { FilterBar } from '../../shared/FilterBar';
import { DetailView } from './DetailView';
import { ErrorDistribution } from './Distribution';

const Titles = styled.div`
  margin-bottom: ${px(units.plus)};
`;

const Label = styled.div`
  margin-bottom: ${px(units.quarter)};
  font-size: ${fontSizes.small};
  color: ${theme.euiColorMediumShade};
`;

const Message = styled.div`
  font-family: ${fontFamilyCode};
  font-weight: bold;
  font-size: ${fontSizes.large};
  margin-bottom: ${px(units.half)};
`;

const Culprit = styled.div`
  font-family: ${fontFamilyCode};
`;

function getShortGroupId(errorGroupId?: string) {
  if (!errorGroupId) {
    return NOT_AVAILABLE_LABEL;
  }

  return errorGroupId.slice(0, 5);
}

interface Props {
  urlParams: IUrlParams;
  location: Location;
}

export function ErrorGroupDetailsView({ urlParams, location }: Props) {
  const { serviceName, start, end, errorGroupId } = urlParams;

  const { data: errorGroupData } = useFetcher(
    () => loadErrorGroupDetails({ serviceName, start, end, errorGroupId }),
    [serviceName, start, end, errorGroupId]
  );

  const { data: errorDistributionData } = useFetcher(
    () => loadErrorDistribution({ serviceName, start, end }),
    [serviceName, start, end]
  );

  if (!errorGroupData || !errorDistributionData) {
    return null;
  }

  // If there are 0 occurrences, show only distribution chart w. empty message
  const showDetails = errorGroupData.occurrencesCount !== 0;
  const logMessage = idx(errorGroupData, _ => _.error.error.log.message);
  const excMessage = idx(
    errorGroupData,
    _ => _.error.error.exception[0].message
  );
  const culprit = idx(errorGroupData, _ => _.error.error.culprit);
  const isUnhandled =
    idx(errorGroupData, _ => _.error.error.exception[0].handled) === false;

  return (
    <div>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h1>
              {i18n.translate('xpack.apm.errorGroupDetails.errorGroupTitle', {
                defaultMessage: 'Error group {errorGroupId}',
                values: {
                  errorGroupId: getShortGroupId(urlParams.errorGroupId)
                }
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        {isUnhandled && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">
              {i18n.translate('xpack.apm.errorGroupDetails.unhandledLabel', {
                defaultMessage: 'Unhandled'
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <FilterBar />
      <EuiSpacer size="s" />

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
                        defaultMessage: 'Log message'
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
                    defaultMessage: 'Exception message'
                  }
                )}
              </Label>
              <Message>{excMessage || NOT_AVAILABLE_LABEL}</Message>
              <Label>
                {i18n.translate('xpack.apm.errorGroupDetails.culpritLabel', {
                  defaultMessage: 'Culprit'
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
              defaultMessage: 'Occurrences'
            }
          )}
        />
      </EuiPanel>
      <EuiSpacer />
      {showDetails && (
        <DetailView
          errorGroup={errorGroupData}
          urlParams={urlParams}
          location={location}
        />
      )}
    </div>
  );
}
