/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonIcon, EuiCopy } from '@elastic/eui';

import { getTransformPreviewDevConsoleStatement } from '../../../../common/data_grid';

import { selectPreviewRequest } from '../../state_management/step_define_selectors';
import { useWizardSelector } from '../../state_management/create_transform_store';

import { useDataView } from '../wizard/wizard';

const copyToClipboardDescription = i18n.translate(
  'xpack.transform.pivotPreview.copyClipboardTooltip',
  {
    defaultMessage: 'Copy Dev Console statement of the transform preview to the clipboard.',
  }
);

export const CopyConfigToClipboard: FC = () => {
  const dataView = useDataView();

  const copyToClipboardPreviewRequest = useWizardSelector((state) =>
    selectPreviewRequest(state, dataView)
  );
  const copyToClipboard = getTransformPreviewDevConsoleStatement(copyToClipboardPreviewRequest);

  return (
    <EuiCopy beforeMessage={copyToClipboardDescription} textToCopy={copyToClipboard}>
      {(copy: () => void) => (
        <EuiButtonIcon
          onClick={copy}
          iconType="copyClipboard"
          aria-label={copyToClipboardDescription}
        />
      )}
    </EuiCopy>
  );
};
