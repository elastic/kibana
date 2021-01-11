/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { LatestFunctionService } from './hooks/use_latest_function_config';

interface LatestFunctionFormProps {
  latestFunctionService: LatestFunctionService;
}

export const LatestFunctionForm: FC<LatestFunctionFormProps> = ({ latestFunctionService }) => {
  return (
    <>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.transform.stepDefineForm.uniqueKeysLabel"
            defaultMessage="Unique keys"
          />
        }
      >
        <EuiComboBox<string>
          fullWidth
          placeholder={i18n.translate('xpack.transform.stepDefineForm.uniqueKeysPlaceholder', {
            defaultMessage: 'Add unique keys ...',
          })}
          options={latestFunctionService.uniqueKeyOptions}
          selectedOptions={latestFunctionService.config.unique_key ?? []}
          onChange={(selected) => {
            latestFunctionService.updateLatestFunctionConfig({
              unique_key: selected,
            });
          }}
          isClearable={false}
          data-test-subj="transformWizardUniqueKeysSelector"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.transform.stepDefineForm.sortLabel"
            defaultMessage="Sort field"
          />
        }
      >
        <EuiComboBox
          fullWidth
          placeholder={i18n.translate('xpack.transform.stepDefineForm.sortPlaceholder', {
            defaultMessage: 'Add a sort field ...',
          })}
          singleSelection={{ asPlainText: true }}
          options={latestFunctionService.sortFieldOptions}
          selectedOptions={
            latestFunctionService.config.sort ? [latestFunctionService.config.sort] : []
          }
          onChange={(selected) => {
            latestFunctionService.updateLatestFunctionConfig({
              sort: { value: selected[0].value, label: selected[0].label as string },
            });
          }}
          isClearable={false}
          data-test-subj="transformWizardSortFieldSelector"
        />
      </EuiFormRow>
    </>
  );
};
