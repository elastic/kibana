/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonSize,
  EuiButtonEmptySizes,
  useEuiTheme,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type AskAssistantButtonProps = (
  | {
      variant: 'basic' | 'iconOnly';
      size: EuiButtonSize;
      fill?: boolean;
      flush?: false;
    }
  | {
      variant: 'empty';
      size: EuiButtonEmptySizes;
      fill?: false;
      flush?: 'both';
    }
) & {
  onClick: () => void;
};

// In order to leverage all the styling / display code that Eui buttons provide,
// we need to have the Sparkle icon part of EuiIcons. While we wait for that to land
// we have to redo some of that logic below. Todo: cleanup once Sparkle icon lands.

export function AskAssistantButton({
  fill,
  flush,
  size,
  variant,
  onClick,
}: AskAssistantButtonProps) {
  const contents = (
    <>
      <SparkleIcon color={variant !== 'empty' && fill ? 'white' : 'blue'} size={size} />
      {variant === 'empty' ? ' ' : null}

      {variant === 'iconOnly'
        ? null
        : i18n.translate('xpack.obsAiAssistant.askAssistantButton.buttonLabel', {
            defaultMessage: 'Ask Assistant',
          })}
    </>
  );

  switch (variant) {
    case 'basic':
      return (
        <EuiButton fill={fill} size={size} onClick={onClick}>
          {contents}
        </EuiButton>
      );

    case 'empty':
      return (
        <EuiButtonEmpty size={size} flush={flush} onClick={onClick}>
          {contents}
        </EuiButtonEmpty>
      );

    case 'iconOnly':
      return (
        <EuiToolTip
          position="top"
          title={i18n.translate('xpack.obsAiAssistant.askAssistantButton.popoverTitle', {
            defaultMessage: 'Elastic Assistant',
          })}
          content={i18n.translate('xpack.obsAiAssistant.askAssistantButton.popoverContent', {
            defaultMessage: 'Get insights into your data with the Elastic Assistant',
          })}
        >
          <EuiButton fill={fill} size={size} style={{ minWidth: 'auto' }} onClick={onClick}>
            {contents}
          </EuiButton>
        </EuiToolTip>
      );
  }
}

// This icon is temporary and should be removed once it lands in Eui.
function SparkleIcon({ size, color }: { size: 'xs' | 's' | 'm'; color: 'white' | 'blue' }) {
  const { euiTheme } = useEuiTheme();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size === 'xs' ? 9.75 : 13}
      height={size === 'xs' ? 9.75 : 13}
      fill="none"
    >
      <path
        fill={color === 'white' ? '#fff' : euiTheme.colors.primaryText}
        d="m4.016 2.382.035-.092a.492.492 0 0 1 .898 0l.035.092a5.9 5.9 0 0 0 3.38 3.536c.061.025.125.05.253.097l.093.036a.492.492 0 0 1 0 .897l-.093.036a5.9 5.9 0 0 0-3.633 3.633l-.035.092a.492.492 0 0 1-.898 0l-.035-.092A5.9 5.9 0 0 0 .636 7.08c-.06-.025-.125-.05-.253-.097a2.17 2.17 0 0 1-.093-.036.492.492 0 0 1 0-.897l.093-.036.253-.096a5.9 5.9 0 0 0 3.38-3.537ZM10.785.17A.973.973 0 0 1 10.8.129a.219.219 0 0 1 .398 0 2.622 2.622 0 0 0 1.518 1.613l.113.042.04.016a.219.219 0 0 1 0 .399l-.04.016-.113.043a2.622 2.622 0 0 0-1.502 1.571.972.972 0 0 1-.016.041.219.219 0 0 1-.398 0 2.622 2.622 0 0 0-1.63-1.656.94.94 0 0 1-.042-.015.219.219 0 0 1 0-.399.968.968 0 0 1 .041-.016l.113-.043A2.622 2.622 0 0 0 10.785.17ZM10.23 8.212l.02-.051a.273.273 0 0 1 .5 0l.02.051.053.14c.333.833.992 1.492 1.824 1.825l.14.053.052.02a.273.273 0 0 1 0 .499l-.052.02-.14.053a3.278 3.278 0 0 0-1.824 1.824l-.054.14c-.01.03-.016.044-.02.052a.273.273 0 0 1-.498 0 1.282 1.282 0 0 1-.02-.051c-.027-.071-.04-.107-.054-.14a3.278 3.278 0 0 0-1.824-1.825l-.14-.053-.052-.02a.273.273 0 0 1 0-.499 1.24 1.24 0 0 1 .052-.02l.14-.053a3.278 3.278 0 0 0 1.824-1.824l.054-.14Z"
      />
    </svg>
  );
}
