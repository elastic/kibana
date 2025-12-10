/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

export interface WaterfallFoldButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function WaterfallFoldButton({ isOpen, onClick }: WaterfallFoldButtonProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButtonIcon
      size="m"
      onClick={onClick}
      iconType={isOpen ? 'fold' : 'unfold'}
      data-test-subj="traceWaterfallFoldButton"
      css={css`
        position: absolute;
        z-index: ${euiTheme.levels.menu};
        padding: ${euiTheme.size.m};
        width: auto;
      `}
      aria-label={i18n.translate('xpack.apm.waterfall.foldButton.ariaLabel', {
        defaultMessage: 'Click to {isAccordionOpen} the waterfall',
        values: {
          isAccordionOpen: isOpen
            ? i18n.translate('xpack.apm.waterfall.foldButton.ariaLabel.fold', {
                defaultMessage: 'fold',
              })
            : i18n.translate('xpack.apm.waterfall.foldButton.ariaLabel.unfold', {
                defaultMessage: 'unfold',
              }),
        },
      })}
    />
  );
}
