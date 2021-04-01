/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiTextColor, EuiToolTip } from '@elastic/eui';
import { TextWithIcon } from '../text_with_icon';

export interface TriggerLineItemProps {
  tooltip?: React.ReactNode;
  incompatible?: boolean;
}

export const TriggerLineItem: React.FC<TriggerLineItemProps> = ({
  tooltip,
  incompatible,
  children,
}) => {
  let content: React.ReactNode = children;

  if (tooltip) {
    content = (
      <EuiToolTip content={tooltip}>
        <>{content}</>
      </EuiToolTip>
    );
  }

  if (incompatible) {
    return (
      <TextWithIcon color={'subdued'} icon={'alert'} iconColor={'danger'}>
        {content}
      </TextWithIcon>
    );
  }

  return <EuiTextColor color={'subdued'}>{content}</EuiTextColor>;
};
