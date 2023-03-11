/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonIcon, EuiCallOut, EuiComboBox, EuiCopy, EuiFormRow } from '@elastic/eui';
import { useAppDependencies } from '../../../../app_dependencies';
import { LatestFunctionService } from './hooks/use_latest_function_config';

interface LatestFunctionFormProps {
  copyToClipboard: string;
  copyToClipboardDescription: string;
  latestFunctionService: LatestFunctionService;
}

export const LatestFunctionForm: FC<LatestFunctionFormProps> = ({
  copyToClipboard,
  copyToClipboardDescription,
  latestFunctionService,
}) => {
  const {
    ml: { useFieldStatsTrigger },
  } = useAppDependencies();
  const { renderOption, closeFlyout } = useFieldStatsTrigger();
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
        data-test-subj="transformLatestFunctionForm"
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
            closeFlyout();
          }}
          isClearable={false}
          data-test-subj="transformWizardUniqueKeysSelector"
          renderOption={renderOption}
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
        helpText={
          latestFunctionService.sortFieldOptions.length > 0
            ? i18n.translate('xpack.transform.stepDefineForm.sortHelpText', {
                defaultMessage: 'Select the date field to be used to identify the latest document.',
              })
            : undefined
        }
      >
        <>
          {latestFunctionService.sortFieldOptions.length > 0 && (
            <EuiComboBox
              fullWidth
              placeholder={i18n.translate('xpack.transform.stepDefineForm.sortPlaceholder', {
                defaultMessage: 'Add a date field ...',
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
                closeFlyout();
              }}
              isClearable={false}
              data-test-subj="transformWizardSortFieldSelector"
              renderOption={renderOption}
            />
          )}
          {latestFunctionService.sortFieldOptions.length === 0 && (
            <EuiCallOut color="danger" iconType="alert" size="m">
              <p>
                <FormattedMessage
                  id="xpack.transform.stepDefineForm.sortFieldOptionsEmptyError"
                  defaultMessage="No date fields are available to sort on. To use another field type, copy the configuration to the clipboard and continue creating the transform in the Console."
                />{' '}
                <EuiCopy beforeMessage={copyToClipboardDescription} textToCopy={copyToClipboard}>
                  {(copy: () => void) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      aria-label={copyToClipboardDescription}
                    />
                  )}
                </EuiCopy>
              </p>
            </EuiCallOut>
          )}
        </>
      </EuiFormRow>
    </>
  );
};
