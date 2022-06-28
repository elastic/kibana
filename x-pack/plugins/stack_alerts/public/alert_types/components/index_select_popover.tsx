/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { isString, debounce } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelect,
} from '@elastic/eui';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  firstFieldOption,
  getFields,
  getIndexOptions,
  getTimeFieldOptions,
  IErrorObject,
} from '@kbn/triggers-actions-ui-plugin/public';

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

export const IndexSelectPopover: React.FunctionComponent<Props> = ({
  index,
  esFields,
  timeField,
  errors,
  onIndexChange,
  onTimeFieldChange,
}) => {
  const { http } = useKibana<KibanaDeps>().services;

  const [indexPopoverOpen, setIndexPopoverOpen] = useState(false);
  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [areIndicesLoading, setAreIndicesLoading] = useState<boolean>(false);
  const [timeFieldOptions, setTimeFieldOptions] = useState([firstFieldOption]);

  const loadIndexOptions = debounce(async (search: string) => {
    setAreIndicesLoading(true);
    setIndexOptions(await getIndexOptions(http!, search));
    setAreIndicesLoading(false);
  }, 250);

  useEffect(() => {
    const timeFields = getTimeFieldOptions(esFields);
    setTimeFieldOptions([firstFieldOption, ...timeFields]);
  }, [esFields]);

  const renderIndices = (indices: string[]) => {
    const rows = indices.map((indexName: string, idx: number) => {
      return (
        <p key={idx}>
          {indexName}
          {idx < indices.length - 1 ? ',' : null}
        </p>
      );
    });
    return <div>{rows}</div>;
  };

  const closeIndexPopover = () => {
    setIndexPopoverOpen(false);
    if (timeField === undefined) {
      onTimeFieldChange('');
    }
  };

  return (
    <EuiPopover
      id="indexPopover"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectIndexExpression"
          description={i18n.translate('xpack.stackAlerts.components.ui.alertParams.indexLabel', {
            defaultMessage: 'index',
          })}
          value={index && index.length > 0 ? renderIndices(index) : firstFieldOption.text}
          isActive={indexPopoverOpen}
          onClick={() => {
            setIndexPopoverOpen(true);
          }}
          isInvalid={!(index && index.length > 0 && timeField !== '')}
        />
      }
      isOpen={indexPopoverOpen}
      closePopover={closeIndexPopover}
      ownFocus
      anchorPosition="downLeft"
      zIndex={8000}
      display="block"
    >
      <div style={{ width: '450px' }}>
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              {i18n.translate('xpack.stackAlerts.components.ui.alertParams.indexButtonLabel', {
                defaultMessage: 'index',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closePopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.stackAlerts.components.ui.alertParams.closeIndexPopoverLabel',
                  {
                    defaultMessage: 'Close',
                  }
                )}
                onClick={closeIndexPopover}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiFormRow
          id="indexSelectSearchBox"
          fullWidth
          label={
            <FormattedMessage
              id="xpack.stackAlerts.components.ui.alertParams.indicesToQueryLabel"
              defaultMessage="Indices to query"
            />
          }
          isInvalid={errors.index.length > 0 && index != null && index.length > 0}
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
            isInvalid={errors.index.length > 0 && index != null && index.length > 0}
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
            onSearchChange={loadIndexOptions}
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
      </div>
    </EuiPopover>
  );
};
