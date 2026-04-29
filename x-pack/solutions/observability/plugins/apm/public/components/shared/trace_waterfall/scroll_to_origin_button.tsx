/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const label = i18n.translate('xpack.apm.traceWaterfall.scrollToOrigin.label', {
  defaultMessage: 'Scroll to origin',
});

const activeTooltip = i18n.translate('xpack.apm.traceWaterfall.scrollToOrigin.activeTooltip', {
  defaultMessage: 'Scroll back to the originally selected span',
});

const disabledTooltip = i18n.translate('xpack.apm.traceWaterfall.scrollToOrigin.disabledTooltip', {
  defaultMessage: 'Originally selected span is visible',
});

// TODO: add isDisabled and onClick in phase 2
export function ScrollToOriginButton(props: {}) {
  return (
    <EuiToolTip content={activeTooltip}>
      <EuiButtonEmpty
        size="xs"
        iconType="arrowLeft"
        onClick={() => {}}
        data-test-subj="waterfallScrollToOriginButton"
      >
        {label}
      </EuiButtonEmpty>
    </EuiToolTip>
  );
}
