/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const NotInDocsContent: FC = () => (
  <Fragment>
    <EuiSpacer size="xxl" />
    <EuiText textAlign="center">
      <EuiIcon type="alert" />
    </EuiText>

    <EuiSpacer size="s" />
    <EuiText textAlign="center">
      <FormattedMessage
        id="xpack.ml.fieldDataCard.fieldNotInDocsLabel"
        defaultMessage="This field does not appear in any documents for the selected time range"
      />
    </EuiText>
  </Fragment>
);
