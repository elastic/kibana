/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { HeaderLarge } from '../../shared/UIComponents';
import DetailView from './DetailView';
import Distribution from './Distribution';
import { KueryBar } from '../../shared/KueryBar';

import { EuiText, EuiBadge } from '@elastic/eui';
import {
  unit,
  units,
  px,
  colors,
  fontFamilyCode,
  fontSizes
} from '../../../style/variables';
import {
  ERROR_CULPRIT,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED
} from '../../../../common/constants';
import { ErrorDistributionRequest } from '../../../store/reactReduxRequest/errorDistribution';
import { ErrorGroupDetailsRequest } from '../../../store/reactReduxRequest/errorGroup';

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

function getShortGroupId(errorGroupId) {
  if (!errorGroupId) {
    return 'N/A';
  }

  return errorGroupId.slice(0, 5);
}

function ErrorGroupDetails({ urlParams, location }) {
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
            <HeaderLarge>
              Error group {getShortGroupId(urlParams.errorGroupId)}
              {isUnhandled && (
                <UnhandledBadge color="warning">Unhandled</UnhandledBadge>
              )}
            </HeaderLarge>

            <KueryBar />

            {showDetails && (
              <Titles>
                <EuiText>
                  {logMessage && (
                    <Fragment>
                      <Label>Log message</Label>
                      <Message>{logMessage}</Message>
                    </Fragment>
                  )}
                  <Label>Exception message</Label>
                  <Message>{excMessage || 'N/A'}</Message>
                  <Label>Culprit</Label>
                  <Culprit>{culprit || 'N/A'}</Culprit>
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

ErrorGroupDetails.propTypes = {
  location: PropTypes.object.isRequired
};

export default ErrorGroupDetails;
