/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiTableComputedColumnType } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';

import type { CaseUI } from '../../../containers/types';
import { CustomFieldTypes } from '../../../../common/types/domain';
import { getEmptyTagValue } from '../../empty_value';

export const getColumn = ({
  key,
  label,
}: {
  key: string;
  label: string;
}): EuiTableComputedColumnType<CaseUI> => ({
  name: label,
  render: (theCase: CaseUI) => {
    const index = theCase.customFields.findIndex((element) => element.key === key);

    if (index === -1) {
      return (
        <EuiSwitch
          data-test-subj={`toggle-custom-field-column-view-${key}`}
          label={''}
          checked={false}
          onChange={() => {}}
          compressed
        />
      );
    }

    if (theCase.customFields[index].type !== CustomFieldTypes.TOGGLE) {
      // should never happen, means something went wrong
      return (
        <div data-test-subj={`empty-toggle-custom-field-column-view-${key}`}>
          {getEmptyTagValue()}
        </div>
      );
    }

    const value = theCase.customFields[index].value;
    const isChecked = typeof value === 'boolean' && value;

    return (
      <EuiSwitch
        data-test-subj={`toggle-custom-field-column-view-${key}`}
        label={''}
        checked={isChecked}
        onChange={() => {}}
        compressed
      />
    );
  },
});
