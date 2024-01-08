/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { useSelector } from 'react-redux';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { DataGrid } from '@kbn/ml-data-grid';

import { useAppDependencies } from '../../../../app_dependencies';
import { useIndexData } from '../../../../hooks/use_index_data';
import { useToastNotifications } from '../../../../app_dependencies';

import { useWizardSelector } from '../../state_management/create_transform_store';
import { selectTransformConfigQuery } from '../../state_management/step_define_selectors';

import { useWizardContext } from '../wizard/wizard';

type PopulatedFields = Set<string>;
const isPopulatedFields = (arg: unknown): arg is PopulatedFields => arg instanceof Set;

export const DataGridFormRow: FC = () => {
  const appDependencies = useAppDependencies();
  const {
    ml: { useFieldStatsFlyoutContext },
  } = appDependencies;

  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;
  const toastNotifications = useToastNotifications();

  const timeRangeMs = useWizardSelector((s) => s.stepDefine.timeRangeMs);
  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);
  const transformConfigQuery = useSelector(selectTransformConfigQuery);

  const fieldStatsContext = useFieldStatsFlyoutContext();
  const indexPreviewProps = {
    ...useIndexData(
      dataView,
      transformConfigQuery,
      runtimeMappings,
      timeRangeMs,
      isPopulatedFields(fieldStatsContext?.populatedFields)
        ? [...fieldStatsContext.populatedFields]
        : []
    ),
    dataTestSubj: 'transformIndexPreview',
    toastNotifications,
  };

  return (
    <EuiFormRow
      fullWidth={true}
      label={i18n.translate('xpack.transform.stepDefineForm.dataGridLabel', {
        defaultMessage: 'Source documents',
      })}
    >
      <DataGrid {...indexPreviewProps} />
    </EuiFormRow>
  );
};
