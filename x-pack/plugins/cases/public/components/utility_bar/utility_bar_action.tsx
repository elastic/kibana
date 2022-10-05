/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { LinkIcon, LinkIconProps } from '../link_icon';
import { BarAction } from './styles';

export interface UtilityBarActionProps extends LinkIconProps {
  dataTestSubj?: string;
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(
  ({ dataTestSubj, children, color, disabled, href, iconSide, iconSize, iconType, onClick }) => {
    return (
      <BarAction data-test-subj={dataTestSubj}>
        <LinkIcon
          color={color}
          disabled={disabled}
          href={href}
          iconSide={iconSide}
          iconSize={iconSize}
          iconType={iconType}
          onClick={onClick}
          dataTestSubj={dataTestSubj ? `${dataTestSubj}-link-icon` : 'utility-bar-action-link-icon'}
        >
          {children}
        </LinkIcon>
      </BarAction>
    );
  }
);

UtilityBarAction.displayName = 'UtilityBarAction';
