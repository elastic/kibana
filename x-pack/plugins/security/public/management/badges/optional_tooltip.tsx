/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { EuiToolTipProps, EuiToolTip } from '@elastic/eui';

interface Props {
  children: ReactElement<any>;
  tooltipContent?: EuiToolTipProps['content'];
}
export const OptionalToolTip = (props: Props) => {
  if (props.tooltipContent) {
    return <EuiToolTip content={props.tooltipContent}>{props.children}</EuiToolTip>;
  }
  return props.children;
};
