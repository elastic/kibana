/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EBT_SCROLL_TO_ORIGIN_ACTION,
  EBT_FLYOUT_WATERFALL_SCROLL_TO_ORIGIN_BUTTON,
} from './ebt_constants';

const label = i18n.translate('xpack.apm.traceWaterfall.scrollToOrigin.label', {
  defaultMessage: 'Scroll to origin',
});

const activeTooltip = i18n.translate('xpack.apm.traceWaterfall.scrollToOrigin.activeTooltip', {
  defaultMessage: 'Scroll back to the originally selected span',
});

const disabledTooltip = i18n.translate('xpack.apm.traceWaterfall.scrollToOrigin.disabledTooltip', {
  defaultMessage: 'Originally selected span is visible',
});

export function ScrollToOriginButton({
  isDisabled,
  onClick,
}: {
  isDisabled: boolean;
  onClick: () => void;
}) {
  return (
    <EuiToolTip content={isDisabled ? disabledTooltip : activeTooltip}>
      <span tabIndex={0} css={{ display: 'inline-block' }}>
        <EuiButtonEmpty
          size="xs"
          iconType="sortLeft"
          isDisabled={isDisabled}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            onClick();
            e.currentTarget.blur();
          }}
          data-ebt-action={EBT_SCROLL_TO_ORIGIN_ACTION}
          data-ebt-element={EBT_FLYOUT_WATERFALL_SCROLL_TO_ORIGIN_BUTTON}
          data-test-subj="waterfallScrollToOriginButton"
        >
          {label}
        </EuiButtonEmpty>
      </span>
    </EuiToolTip>
  );
}
