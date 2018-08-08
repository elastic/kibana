/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiSpacer,
  EuiIcon,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';
import { CheckingSettings } from './checking_settings';
import { ReasonFound, WeTried } from './reasons';
import { CheckerErrors } from './checker_errors';
import '../../less/components/no_data.less';

function NoDataMessage(props) {
  const { isLoading, reason, checkMessage } = props;

  if (isLoading && checkMessage !== null) {
    return <CheckingSettings checkMessage={checkMessage} />;
  }

  if (reason) {
    return <ReasonFound {...props} />;
  }

  return <WeTried />;
}

export function NoData(props) {

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
          className="noData__content"
        >
          <EuiIcon type="monitoringApp" size="xxl" />
          <EuiSpacer size="m" />
          <NoDataMessage {...props} />
          <CheckerErrors errors={props.errors} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

NoData.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  reason: PropTypes.object,
  checkMessage: PropTypes.string
};
