/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEvent } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { EventsTd, EventsTdContent } from '../../styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';

interface ActionIconItemProps {
  ariaLabel?: string;
  id: string;
  width?: number;
  dataTestSubj?: string;
  content?: string;
  iconType?: string;
  isDisabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  children?: React.ReactNode;
}

const ActionIconItemComponent: React.FC<ActionIconItemProps> = ({
  id,
  width = DEFAULT_ICON_BUTTON_WIDTH,
  dataTestSubj,
  content,
  ariaLabel,
  iconType = '',
  isDisabled = false,
  onClick,
  children,
}) => (
  <EventsTd key={id}>
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
  </EventsTd>
);

ActionIconItemComponent.displayName = 'ActionIconItemComponent';

export const ActionIconItem = React.memo(ActionIconItemComponent);
