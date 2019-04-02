/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';

import { inputsModel } from '../../store';

import * as i18n from './translations';
interface Props {
  loading: boolean;
  refetch: inputsModel.Refetch[];
}

export const UpdateButton = pure<Props>(({ loading, refetch }) => {
  const color = loading ? 'secondary' : 'primary';
  const icon = 'refresh';
  let text = i18n.REFRESH;

  if (loading) {
    text = i18n.UPDATING;
  }

  return (
    <EuiButton
      isLoading={loading}
      className="euiGlobalDatePicker__updateButton"
      color={color}
      fill
      iconType={icon}
      onClick={() => refetchQuery(refetch)}
      textProps={{ className: 'euiGlobalDatePicker__updateButtonText' }}
    >
      {text}
    </EuiButton>
  );
});

const refetchQuery = (query: inputsModel.Refetch[]) => {
  query.forEach((refetch: inputsModel.Refetch) => refetch());
};
