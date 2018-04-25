/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import withErrorHandler from '../../shared/withErrorHandler';
import { HeaderLarge } from '../../shared/UIComponents';
import DetailView from './DetailView';
import Distribution from './Distribution';

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
import { getKey } from '../../../store/apiHelpers';

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

function loadErrorGroup(props) {
  const { serviceName, errorGroupId, start, end } = props.urlParams;
  const key = getKey({ serviceName, errorGroupId, start, end });
  if (key && props.errorGroup.key !== key) {
    props.loadErrorGroup({ serviceName, errorGroupId, start, end });
  }
}

function getShortGroupId(errorGroupId) {
  if (!errorGroupId) {
    return 'N/A';
  }

  return errorGroupId.slice(0, 5);
}

class ErrorGroupDetails extends Component {
  componentDidMount() {
    loadErrorGroup(this.props);
  }

  componentWillReceiveProps(nextProps) {
    loadErrorGroup(nextProps);
  }

  render() {
    const { errorGroup, urlParams, location } = this.props;

    // If there are 0 occurrences, show only distribution chart w. empty message
    const showDetails = errorGroup.data.occurrencesCount !== 0;
    const logMessage = get(errorGroup.data.error, ERROR_LOG_MESSAGE);
    const excMessage = get(errorGroup.data.error, ERROR_EXC_MESSAGE);
    const culprit = get(errorGroup.data.error, ERROR_CULPRIT);
    const isUnhandled = get(errorGroup.data.error, ERROR_EXC_HANDLED) === false;

    return (
      <div>
        <HeaderLarge>
          Error group {getShortGroupId(urlParams.errorGroupId)}
          {isUnhandled && (
            <UnhandledBadge color="warning">Unhandled</UnhandledBadge>
          )}
        </HeaderLarge>

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
        <Distribution />
        {showDetails && (
          <DetailView
            errorGroup={errorGroup}
            urlParams={urlParams}
            location={location}
          />
        )}
      </div>
    );
  }
}

ErrorGroupDetails.propTypes = {
  location: PropTypes.object.isRequired
};

export default withErrorHandler(ErrorGroupDetails, ['errorGroup']);
