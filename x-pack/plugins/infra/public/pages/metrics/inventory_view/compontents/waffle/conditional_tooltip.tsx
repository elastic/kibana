/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiToolTip, EuiToolTipProps } from '@elastic/eui';
import { omit } from 'lodash';

interface Props extends EuiToolTipProps {
  hidden: boolean;
}

export const ConditionalToolTip = (props: Props) => {
  if (props.hidden) {
    return props.children;
  }
  const propsWithoutHidden = omit(props, 'hidden');
  return <EuiToolTip {...propsWithoutHidden}>{props.children}</EuiToolTip>;
};
