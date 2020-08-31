/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { EuiFormRow, EuiFieldNumber, EuiComboBox, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SettingsProps } from './settings';
import { AdvancedSettings } from '../../types';

// Helper type to get all keys of an interface
// that are of type number.
// Used to parameterize the number updater function
// to make it impossible to pass in non-number keys
type NumberKeys<T> = Exclude<
  {
    [K in keyof T]: T[K] extends number ? K : never;
  }[keyof T],
  undefined
>;

export function AdvancedSettingsForm({
  advancedSettings,
  updateSettings,
  allFields,
}: Pick<SettingsProps, 'advancedSettings' | 'updateSettings' | 'allFields'>) {
  // keep a local state during changes
  const [formState, updateFormState] = useState({ ...advancedSettings });
  // useEffect update localState only based on the main store
  useEffect(() => {
    updateFormState(advancedSettings);
  }, [updateFormState, advancedSettings]);

  function updateSetting<K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) {
    updateSettings({ ...advancedSettings, [key]: value });
  }

  function getNumberUpdater<K extends NumberKeys<AdvancedSettings>>(key: K) {
    return function ({
      target: { valueAsNumber, value },
    }: {
      target: { valueAsNumber: number; value: string };
    }) {
      // if the value is valid, then update the central store, otherwise only the local store
      if (Number.isNaN(valueAsNumber)) {
        // localstate update
        return updateFormState({ ...formState, [key]: value });
      }
      // do not worry about local store here, the useEffect will pick that up and sync it
      updateSetting(key, valueAsNumber);
    };
  }

  return (
    <form>
      <EuiFormRow
        fullWidth
        helpText={i18n.translate('xpack.graph.settings.advancedSettings.sampleSizeInputHelpText', {
          defaultMessage:
            'Terms are identified from samples of the most relevant documents. Bigger samples are not necessarily better—they can be slower and less relevant.',
        })}
        label={i18n.translate('xpack.graph.settings.advancedSettings.sampleSizeInputLabel', {
          defaultMessage: 'Sample size',
        })}
      >
        <EuiFieldNumber
          fullWidth
          min={1}
          step={1}
          value={formState.sampleSize}
          onChange={getNumberUpdater('sampleSize')}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        helpText={i18n.translate(
          'xpack.graph.settings.advancedSettings.significantLinksCheckboxHelpText',
          {
            defaultMessage: 'Identify terms that are significant rather than popular.',
          }
        )}
        label=""
      >
        <EuiSwitch
          label={i18n.translate(
            'xpack.graph.settings.advancedSettings.significantLinksCheckboxLabel',
            { defaultMessage: 'Significant links' }
          )}
          id="graphSignificance"
          checked={formState.useSignificance}
          onChange={({ target: { checked } }) => updateSetting('useSignificance', checked)}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        helpText={i18n.translate('xpack.graph.settings.advancedSettings.certaintyInputHelpText', {
          defaultMessage: 'The minimum number of documents before introducing a related term.',
        })}
        label={i18n.translate('xpack.graph.settings.advancedSettings.certaintyInputLabel', {
          defaultMessage: 'Certainty',
        })}
      >
        <EuiFieldNumber
          fullWidth
          min={1}
          step={1}
          value={formState.minDocCount}
          onChange={getNumberUpdater('minDocCount')}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        helpText={
          <>
            {i18n.translate('xpack.graph.settings.advancedSettings.diversityFieldInputHelpText1', {
              defaultMessage:
                'To avoid dominating samples with a single voice, select a field to help identify the source of bias.',
            })}{' '}
            <em>
              {i18n.translate(
                'xpack.graph.settings.advancedSettings.diversityFieldInputHelpText2',
                {
                  defaultMessage: 'This must be a single-term field, or searches will be rejected.',
                }
              )}
            </em>
          </>
        }
        label={i18n.translate('xpack.graph.settings.advancedSettings.diversityFieldInputLabel', {
          defaultMessage: 'Diversity field',
        })}
      >
        <EuiComboBox
          fullWidth
          placeholder={i18n.translate(
            'xpack.graph.settings.advancedSettings.diversityFieldInputOptionLabel',
            { defaultMessage: 'No diversification' }
          )}
          singleSelection={{ asPlainText: true }}
          options={allFields.map((field) => ({ label: field.name, value: field }))}
          selectedOptions={
            formState.sampleDiversityField
              ? [
                  {
                    label: formState.sampleDiversityField.name,
                    value: formState.sampleDiversityField,
                  },
                ]
              : []
          }
          onChange={(choices) => {
            updateSetting(
              'sampleDiversityField',
              choices.length === 1 ? choices[0].value : undefined
            );
          }}
        />
      </EuiFormRow>

      {formState.sampleDiversityField && (
        <EuiFormRow
          fullWidth
          helpText={
            <>
              {i18n.translate('xpack.graph.settings.advancedSettings.maxValuesInputHelpText', {
                defaultMessage:
                  'Max number of documents in a sample that can contain the same value for the',
              })}{' '}
              <em>{formState.sampleDiversityField.name}</em>{' '}
              {i18n.translate(
                'xpack.graph.settings.advancedSettings.maxValuesInputHelpText.fieldText',
                {
                  defaultMessage: 'field',
                }
              )}
            </>
          }
          label={i18n.translate('xpack.graph.settings.advancedSettings.maxValuesInputLabel', {
            defaultMessage: 'Max docs per field',
          })}
        >
          <EuiFieldNumber
            fullWidth
            min={1}
            step={1}
            value={formState.maxValuesPerDoc}
            onChange={getNumberUpdater('maxValuesPerDoc')}
          />
        </EuiFormRow>
      )}

      <EuiFormRow
        fullWidth
        helpText={i18n.translate('xpack.graph.settings.advancedSettings.timeoutInputHelpText', {
          defaultMessage: 'The maximum number of milliseconds that a request can run.',
        })}
        label={i18n.translate('xpack.graph.settings.advancedSettings.timeoutInputLabel', {
          defaultMessage: 'Timeout',
        })}
      >
        <EuiFieldNumber
          fullWidth
          min={1}
          step={1}
          value={formState.timeoutMillis}
          onChange={getNumberUpdater('timeoutMillis')}
          append={
            <EuiText size="xs">
              <strong>
                {i18n.translate('xpack.graph.settings.advancedSettings.timeoutUnit', {
                  defaultMessage: 'ms',
                })}
              </strong>
            </EuiText>
          }
        />
      </EuiFormRow>
    </form>
  );
}
