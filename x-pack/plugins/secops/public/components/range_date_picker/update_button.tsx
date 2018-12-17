/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { pure } from 'recompose';
import { inputsModel } from '../../store';

interface Props {
  isLoading: boolean;
  refetch: inputsModel.Refetch[];
}

export const UpdateButton = pure<Props>(({ isLoading, refetch }) => {
  const color = isLoading ? 'secondary' : 'primary';
  const icon = 'refresh';
  let text = 'Refresh';

  if (isLoading) {
    text = 'Updating';
  }

  return (
    <EuiButton
      isLoading={isLoading}
      className="euiGlobalDatePicker__updateButton"
      color={color}
      fill
      iconType={icon}
      onClick={refetchQuery.bind(null, refetch)}
      textProps={{ className: 'euiGlobalDatePicker__updateButtonText' }}
    >
      {text}
    </EuiButton>
  );
});

const refetchQuery = (query: inputsModel.Refetch[]) => {
  query.forEach((refetch: inputsModel.Refetch) => refetch());
};
