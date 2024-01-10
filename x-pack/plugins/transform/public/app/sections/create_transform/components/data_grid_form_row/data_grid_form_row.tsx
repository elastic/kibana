/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { DataGrid } from '@kbn/ml-data-grid';

import { useIndexData } from '../../../../hooks/use_index_data';
import { useToastNotifications } from '../../../../app_dependencies';

export const DataGridFormRow: FC = () => {
  const toastNotifications = useToastNotifications();

  const indexData = useIndexData();

  const indexPreviewProps = useMemo(
    () => {
      return {
        ...indexData,
        dataTestSubj: 'transformIndexPreview',
        toastNotifications,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indexData]
  );

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
