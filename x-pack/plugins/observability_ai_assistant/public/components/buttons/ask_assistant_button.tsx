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
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type AskAssistantButtonProps = (
  | {
      variant: 'basic';
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
  | {
      variant: 'iconOnly';
      size: EuiButtonSize;
      fill?: boolean;
      flush?: false;
    }
) & {
  onClick: () => void;
};

export function AskAssistantButton({
  fill,
  flush,
  size,
  variant,
  onClick,
}: AskAssistantButtonProps) {
  const buttonLabel = i18n.translate(
    'xpack.observabilityAiAssistant.askAssistantButton.buttonLabel',
    {
      defaultMessage: 'Ask Assistant',
    }
  );

  switch (variant) {
    case 'basic':
      return (
        <EuiButton fill={fill} size={size} iconType="sparkles" onClick={onClick}>
          {buttonLabel}
        </EuiButton>
      );

    case 'empty':
      return (
        <EuiButtonEmpty size={size} flush={flush} iconType="sparkles" onClick={onClick}>
          {buttonLabel}
        </EuiButtonEmpty>
      );

    case 'iconOnly':
      return (
        <EuiToolTip
          position="top"
          title={i18n.translate('xpack.observabilityAiAssistant.askAssistantButton.popoverTitle', {
            defaultMessage: 'Elastic Assistant',
          })}
          content={i18n.translate(
            'xpack.observabilityAiAssistant.askAssistantButton.popoverContent',
            {
              defaultMessage: 'Get insights into your data with the Elastic Assistant',
            }
          )}
        >
          <EuiButtonIcon
            iconType="sparkles"
            display={fill ? 'fill' : 'base'}
            size={size}
            style={{ minWidth: 'auto' }}
            onClick={onClick}
          />
        </EuiToolTip>
      );
  }
}
