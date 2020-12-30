/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const ErrorList = ({ errors }) => {
  const errorsMap = {};
  return errors
    .filter((err) => {
      const { statusCode, error, message } = err;
      const key = `${statusCode}${error}${message}`;
      if (!errorsMap[key]) {
        errorsMap[key] = true;
        return true;
      }
    })
    .map((error, errorIndex) => {
      const { message, statusCode, error: friendlyName } = error;
      return (
        <Fragment key={`checker-error-${errorIndex}`}>
          <EuiDescriptionListTitle>
            {statusCode} {friendlyName}
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{message}</EuiDescriptionListDescription>
        </Fragment>
      );
    });
};

export function CheckerErrors(props) {
  if (props.errors === undefined || props.errors.length === 0) {
    return null;
  }

  return (
    <Fragment>
      <EuiSpacer />
      <EuiCallOut title="Errors found" color="danger" className="eui-textLeft">
        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.checkerErrors.checkEsSettingsErrorMessage"
            defaultMessage="There were some errors encountered in trying to check Elasticsearch
            settings. You need administrator rights to check the settings and, if
            needed, to enable the monitoring collection setting."
          />
        </p>

        <EuiDescriptionList>
          <ErrorList {...props} />
        </EuiDescriptionList>
      </EuiCallOut>
    </Fragment>
  );
}

CheckerErrors.propTypes = {
  errors: PropTypes.array,
};
