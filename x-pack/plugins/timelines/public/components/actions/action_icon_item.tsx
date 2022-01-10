/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { EventsTdContent } from '../t_grid/styles';
import { DEFAULT_ACTION_BUTTON_WIDTH } from '../t_grid/body/constants';

interface ActionIconItemProps {
  ariaLabel?: string;
  width?: number;
  dataTestSubj?: string;
  content?: string;
  iconType?: string;
  isDisabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  children?: React.ReactNode;
}

const ActionIconItemComponent: React.FC<ActionIconItemProps> = ({
  width = DEFAULT_ACTION_BUTTON_WIDTH,
  dataTestSubj,
  content,
  ariaLabel,
  iconType = '',
  isDisabled = false,
  onClick,
  children,
}) => (
  <div>
    <EventsTdContent textAlign="center" width={width}>
      {children ?? (
        <EuiToolTip data-test-subj={`${dataTestSubj}-tool-tip`} content={content}>
          <EuiButtonIcon
            aria-label={ariaLabel}
            data-test-subj={`${dataTestSubj}-button`}
            iconType={iconType}
            isDisabled={isDisabled}
            onClick={onClick}
          />
        </EuiToolTip>
      )}
    </EventsTdContent>
  </div>
);

ActionIconItemComponent.displayName = 'ActionIconItemComponent';

export const ActionIconItem = React.memo(ActionIconItemComponent);
