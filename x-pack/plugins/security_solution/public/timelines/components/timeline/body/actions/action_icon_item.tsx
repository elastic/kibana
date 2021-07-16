/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';

import { EventsTdContent } from '../../styles';
import { DEFAULT_ICON_BUTTON_WIDTH } from '../../helpers';

interface ActionIconItemProps {
  ariaLabel?: string;
  width?: number;
  dataTestSubj?: string;
  content?: string;
  iconType?: string;
  isDisabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  children?: React.ReactNode;
  buttonType?: 'text' | 'icon';
}

const ActionIconItemComponent: React.FC<ActionIconItemProps> = ({
  width = DEFAULT_ICON_BUTTON_WIDTH,
  dataTestSubj,
  content,
  ariaLabel,
  iconType = '',
  isDisabled = false,
  onClick,
  children,
  buttonType = 'icon',
}) => (
  <>
    {buttonType === 'icon' && iconType && (
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
    )}
    {(buttonType === 'text' || !iconType) && (
      <EuiButtonEmpty
        aria-label={ariaLabel}
        data-test-subj={`${dataTestSubj}-button`}
        isDisabled={isDisabled}
        onClick={onClick}
        color="text"
      >
        {content}
      </EuiButtonEmpty>
    )}
  </>
);

ActionIconItemComponent.displayName = 'ActionIconItemComponent';

export const ActionIconItem = React.memo(ActionIconItemComponent);
