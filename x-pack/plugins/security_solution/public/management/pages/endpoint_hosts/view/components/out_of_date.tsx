/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const OutOfDate = React.memo<{ style?: React.CSSProperties }>(({ style, ...otherProps }) => {
  return (
    <EuiText
      color="subdued"
      size="xs"
      className="eui-textNoWrap eui-displayInlineBlock"
      style={style}
      {...otherProps}
    >
      <EuiIcon className={'eui-alignTop'} size="m" type="alert" color="warning" />
      <FormattedMessage id="xpack.securitySolution.outOfDateLabel" defaultMessage="Out-of-date" />
    </EuiText>
  );
});

OutOfDate.displayName = 'OutOfDate';
