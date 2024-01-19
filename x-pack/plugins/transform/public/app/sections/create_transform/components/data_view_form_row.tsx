/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useDataView, useSearchItems } from './wizard/wizard';

export const DataViewFormRow: FC = () => {
  const searchItems = useSearchItems();
  const dataView = useDataView();
  const indexPattern = useMemo(() => dataView.getIndexPattern(), [dataView]);

  if (searchItems.savedSearch === undefined) return null;

  return (
    <EuiFormRow
      label={i18n.translate('xpack.transform.stepDefineForm.dataViewLabel', {
        defaultMessage: 'Data view',
      })}
    >
      <span>{indexPattern}</span>
    </EuiFormRow>
  );
};
