/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { EuiIcon, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

export const NotInDocsContent: FC = () => (
  <Fragment>
    <EuiText textAlign="center">
      <EuiIcon type="alert" />
    </EuiText>
    <EuiText textAlign="center" size={'xs'}>
      <FormattedMessage
        id="xpack.dataVisualizer.dataGrid.field.fieldNotInDocsLabel"
        defaultMessage="This field does not appear in any documents for the selected time range"
      />
    </EuiText>
  </Fragment>
);
