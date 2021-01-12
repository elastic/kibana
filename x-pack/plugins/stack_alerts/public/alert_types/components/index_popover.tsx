/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState, Fragment } from 'react';
import { isString } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiSelect } from '@elastic/eui';
import { HttpSetup } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import {
  firstFieldOption,
  getFields,
  getIndexOptions,
  getIndexPatterns,
  getTimeFieldOptions,
  IErrorObject,
} from '../../../../triggers_actions_ui/public';

interface KibanaDeps {
  http: HttpSetup;
}

interface Props {
  index: string[];
  esFields: Array<{
    name: string;
    type: string;
    normalizedType: string;
    searchable: boolean;
    aggregatable: boolean;
  }>;
  timeField: string | undefined;
  errors: IErrorObject;
  onIndexChange: (indices: string[]) => void;
  onTimeFieldChange: (timeField: string) => void;
}

export const IndexPopover: React.FunctionComponent<Props> = ({
  index,
  esFields,
  timeField,
  errors,
  onIndexChange,
  onTimeFieldChange,
}) => {
  const { http } = useKibana<KibanaDeps>().services;

  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [indexPatterns, setIndexPatterns] = useState([]);
  const [areIndicesLoading, setAreIndicesLoading] = useState<boolean>(false);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

  useEffect(() => {
    const indexPatternsFunction = async () => {
      setIndexPatterns(await getIndexPatterns());
    };
    indexPatternsFunction();
  }, []);

  useEffect(() => {
    const timeFields = getTimeFieldOptions(esFields);
    setTimeFieldOptions([firstFieldOption, ...timeFields]);
  }, [esFields]);

  return (
    <Fragment>
      <EuiFormRow
        id="indexSelectSearchBox"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.components.ui.alertParams.indicesToQueryLabel"
            defaultMessage="Indices to query"
          />
        }
        isInvalid={errors.index.length > 0 && index !== undefined}
        error={errors.index}
        helpText={
          <FormattedMessage
            id="xpack.stackAlerts.components.ui.alertParams.howToBroadenSearchQueryDescription"
            defaultMessage="Use * to broaden your query."
          />
        }
      >
        <EuiComboBox
          fullWidth
          async
          isLoading={areIndicesLoading}
          isInvalid={errors.index.length > 0 && index !== undefined}
          noSuggestions={!indexOptions.length}
          options={indexOptions}
          data-test-subj="thresholdIndexesComboBox"
          selectedOptions={(index || []).map((anIndex: string) => {
            return {
              label: anIndex,
              value: anIndex,
            };
          })}
          onChange={async (selected: EuiComboBoxOptionOption[]) => {
            const selectedIndices = selected
              .map((aSelected) => aSelected.value)
              .filter<string>(isString);
            onIndexChange(selectedIndices);

            // reset time field if indices have been reset
            if (selectedIndices.length === 0) {
              setTimeFieldOptions([firstFieldOption]);
            } else {
              const currentEsFields = await getFields(http!, selectedIndices);
              const timeFields = getTimeFieldOptions(currentEsFields);
              setTimeFieldOptions([firstFieldOption, ...timeFields]);
            }
          }}
          onSearchChange={async (search) => {
            setAreIndicesLoading(true);
            setIndexOptions(await getIndexOptions(http!, search, indexPatterns));
            setAreIndicesLoading(false);
          }}
          onBlur={() => {
            if (!index) {
              onIndexChange([]);
            }
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        id="thresholdTimeField"
        fullWidth
        label={
          <FormattedMessage
            id="xpack.stackAlerts.components.ui.alertParams.timeFieldLabel"
            defaultMessage="Time field"
          />
        }
        isInvalid={errors.timeField.length > 0 && timeField !== undefined}
        error={errors.timeField}
      >
        <EuiSelect
          options={timeFieldOptions}
          isInvalid={errors.timeField.length > 0 && timeField !== undefined}
          fullWidth
          name="thresholdTimeField"
          data-test-subj="thresholdAlertTimeFieldSelect"
          value={timeField || ''}
          onChange={(e) => {
            onTimeFieldChange(e.target.value);
          }}
          onBlur={() => {
            if (timeField === undefined) {
              onTimeFieldChange('');
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
