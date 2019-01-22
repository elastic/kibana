/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { get } from 'lodash';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_LOG_MESSAGE
} from '../../../../common/constants';
import { NOT_AVAILABLE_LABEL } from '../../../constants';
import { ErrorDistributionRequest } from '../../../store/reactReduxRequest/errorDistribution';
import { ErrorGroupDetailsRequest } from '../../../store/reactReduxRequest/errorGroup';
import { IUrlParams } from '../../../store/urlParams';
import {
  colors,
  fontFamilyCode,
  fontSizes,
  px,
  unit,
  units
} from '../../../style/variables';
// @ts-ignore
import { KueryBar } from '../../shared/KueryBar';
import { DetailView } from './DetailView';
// @ts-ignore
import Distribution from './Distribution';

const Titles = styled.div`
  margin-bottom: ${px(units.plus)};
`;

const UnhandledBadge = styled(EuiBadge)`
  margin-left: ${px(unit)};
  margin-top: -${px(units.half - 1)};
`;

const Label = styled.div`
  margin-bottom: ${px(units.quarter)};
  font-size: ${fontSizes.small};
  color: ${colors.gray3};
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

export function ErrorGroupDetails({ urlParams, location }: Props) {
  return (
    <ErrorGroupDetailsRequest
      urlParams={urlParams}
      render={errorGroup => {
        // If there are 0 occurrences, show only distribution chart w. empty message
        const showDetails = errorGroup.data.occurrencesCount !== 0;
        const logMessage = get(errorGroup.data.error, ERROR_LOG_MESSAGE);
        const excMessage = get(errorGroup.data.error, ERROR_EXC_MESSAGE);
        const culprit = get(errorGroup.data.error, ERROR_CULPRIT);
        const isUnhandled =
          get(errorGroup.data.error, ERROR_EXC_HANDLED) === false;

        return (
          <div>
            <EuiTitle>
              <span>
                {i18n.translate('xpack.apm.errorGroupDetails.errorGroupTitle', {
                  defaultMessage: 'Error group {errorGroupId}',
                  values: {
                    errorGroupId: getShortGroupId(urlParams.errorGroupId)
                  }
                })}
                {isUnhandled && (
                  <UnhandledBadge color="warning">
                    {i18n.translate(
                      'xpack.apm.errorGroupDetails.unhandledLabel',
                      {
                        defaultMessage: 'Unhandled'
                      }
                    )}
                  </UnhandledBadge>
                )}
              </span>
            </EuiTitle>

            <EuiSpacer size="m" />

            <KueryBar />

            <EuiSpacer size="s" />

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
                    {i18n.translate(
                      'xpack.apm.errorGroupDetails.culpritLabel',
                      {
                        defaultMessage: 'Culprit'
                      }
                    )}
                  </Label>
                  <Culprit>{culprit || NOT_AVAILABLE_LABEL}</Culprit>
                </EuiText>
              </Titles>
            )}
            <ErrorDistributionRequest
              urlParams={urlParams}
              render={({ data }) => <Distribution distribution={data} />}
            />
            {showDetails && (
              <DetailView
                errorGroup={errorGroup}
                urlParams={urlParams}
                location={location}
              />
            )}
          </div>
        );
      }}
    />
  );
}
