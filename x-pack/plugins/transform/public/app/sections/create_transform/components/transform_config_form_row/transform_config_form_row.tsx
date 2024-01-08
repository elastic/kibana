/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiForm } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { getTransformPreviewDevConsoleStatement } from '../../../../common/data_grid';

import { selectPreviewRequest } from '../../state_management/step_define_selectors';
import { useWizardSelector } from '../../state_management/create_transform_store';

import { useWizardContext } from '../wizard/wizard';

import { LatestFunctionForm } from './latest_function_form';
import { PivotFunctionForm } from './pivot_function_form';

export const TransformConfigFormRow: FC = () => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

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

  return (
    <EuiForm>
      {transformFunction === TRANSFORM_FUNCTION.PIVOT ? (
        <PivotFunctionForm
          {...{
            copyToClipboard,
            copyToClipboardDescription,
          }}
        />
      ) : null}
      {transformFunction === TRANSFORM_FUNCTION.LATEST ? (
        <LatestFunctionForm
          copyToClipboard={copyToClipboard}
          copyToClipboardDescription={copyToClipboardDescription}
        />
      ) : null}
    </EuiForm>
  );
};
