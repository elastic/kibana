/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { isUpgradeInProgress } from '../../services/upgrade_service';

export const UpgradeWarning: FC = () => {
  if (isUpgradeInProgress() === true) {
    return (
      <React.Fragment>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ml.upgrade.upgradeWarning.upgradeInProgressWarningTitle"
              defaultMessage="Index migration in progress"
            />
          }
          color="warning"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.ml.upgrade.upgradeWarning.upgradeInProgressWarningDescription"
              defaultMessage="Indices related to Machine Learning are currently being upgraded."
            />
            <br />
            <FormattedMessage
              id="xpack.ml.upgrade.upgradeWarning.upgradeInProgressWarningDescriptionExtra"
              defaultMessage="Some actions will not be available during this time."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </React.Fragment>
    );
  }

  return null;
};
