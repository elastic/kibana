/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFormRow, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { DataGrid } from '@kbn/ml-data-grid';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { getTransformPreviewDevConsoleStatement } from '../../../../common/data_grid';
import { useTransformConfigData } from '../../../../hooks/use_transform_config_data';
import { useToastNotifications } from '../../../../app_dependencies';

import { useWizardSelector } from '../../state_management/create_transform_store';
import { selectPreviewRequest } from '../../state_management/step_define_selectors';

import { useWizardContext } from '../wizard/wizard';

export const TransformConfigPreviewFormRow: FC = () => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const toastNotifications = useToastNotifications();

  const transformFunction = useWizardSelector((s) => s.stepDefine.transformFunction);

  const copyToClipboardPreviewRequest = useWizardSelector((state) =>
    selectPreviewRequest(state, dataView)
  );
  const copyToClipboard = getTransformPreviewDevConsoleStatement(copyToClipboardPreviewRequest);
  const copyToClipboardDescription = i18n.translate(
    'xpack.transform.pivotPreview.copyClipboardTooltip',
    {
      defaultMessage: 'Copy Dev Console statement of the transform preview to the clipboard.',
    }
  );

  const previewProps = {
    ...useTransformConfigData(),
    dataTestSubj: 'transformPivotPreview',
    toastNotifications,
    ...(transformFunction === TRANSFORM_FUNCTION.LATEST
      ? {
          copyToClipboard,
          copyToClipboardDescription,
        }
      : {}),
  };

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.transform.stepDefineForm.previewLabel', {
        defaultMessage: 'Preview',
      })}
    >
      <>
        <DataGrid {...previewProps} />
        <EuiSpacer size="m" />
      </>
    </EuiFormRow>
  );
};
