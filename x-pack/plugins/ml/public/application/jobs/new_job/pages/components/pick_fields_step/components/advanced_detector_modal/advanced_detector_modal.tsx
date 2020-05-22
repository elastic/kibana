/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useContext, useEffect } from 'react';
import {
  EuiComboBox,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlexGrid,
  EuiComboBoxOptionOption,
  EuiHorizontalRule,
  EuiTextArea,
} from '@elastic/eui';
import { JobCreatorContext } from '../../../job_creator_context';
import { AdvancedJobCreator } from '../../../../../common/job_creator';
import {
  createFieldOptions,
  createMlcategoryFieldOption,
} from '../../../../../common/job_creator/util/general';
import {
  Field,
  Aggregation,
  EVENT_RATE_FIELD_ID,
  mlCategory,
} from '../../../../../../../../../common/types/fields';
import { RichDetector } from '../../../../../common/job_creator/advanced_job_creator';
import { ModalWrapper } from './modal_wrapper';
import { detectorToString } from '../../../../../../../util/string_utils';
import { createBasicDetector } from '../../../../../common/job_creator/util/default_configs';

import {
  AggDescription,
  FieldDescription,
  ByFieldDescription,
  OverFieldDescription,
  PartitionFieldDescription,
  ExcludeFrequentDescription,
  DescriptionDescription,
} from './descriptions';

interface Props {
  payload: ModalPayload;
  fields: Field[];
  aggs: Aggregation[];
  detectorChangeHandler: (dtr: RichDetector, index?: number) => void;
  closeModal(): void;
}

export interface ModalPayload {
  detector: RichDetector;
  index?: number;
}

const emptyOption: EuiComboBoxOptionOption = {
  label: '',
};

const excludeFrequentOptions: EuiComboBoxOptionOption[] = [{ label: 'all' }, { label: 'none' }];

export const AdvancedDetectorModal: FC<Props> = ({
  payload,
  fields,
  aggs,
  detectorChangeHandler,
  closeModal,
}) => {
  const { jobCreator: jc } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;

  const [detector, setDetector] = useState(payload.detector);
  const [aggOption, setAggOption] = useState(createAggOption(detector.agg));
  const [fieldOption, setFieldOption] = useState(createFieldOption(detector.field));
  const [byFieldOption, setByFieldOption] = useState(createFieldOption(detector.byField));
  const [overFieldOption, setOverFieldOption] = useState(createFieldOption(detector.overField));
  const [partitionFieldOption, setPartitionFieldOption] = useState(
    createFieldOption(detector.partitionField)
  );
  const [excludeFrequentOption, setExcludeFrequentOption] = useState(
    createExcludeFrequentOption(detector.excludeFrequent)
  );
  const [descriptionOption, setDescriptionOption] = useState(detector.description || '');
  const [splitFieldsEnabled, setSplitFieldsEnabled] = useState(true);
  const [excludeFrequentEnabled, setExcludeFrequentEnabled] = useState(true);
  const [fieldOptionEnabled, setFieldOptionEnabled] = useState(true);
  const { descriptionPlaceholder, setDescriptionPlaceholder } = useDetectorPlaceholder(detector);

  const usingScriptFields = jobCreator.additionalFields.length > 0;
  // list of aggregation combobox options.

  const aggOptions: EuiComboBoxOptionOption[] = aggs
    .filter((agg) => filterAggs(agg, usingScriptFields))
    .map(createAggOption);

  // fields available for the selected agg
  const { currentFieldOptions, setCurrentFieldOptions } = useCurrentFieldOptions(
    detector.agg,
    jobCreator.additionalFields,
    fields
  );

  const allFieldOptions: EuiComboBoxOptionOption[] = [
    ...createFieldOptions(fields, jobCreator.additionalFields),
  ].sort(comboBoxOptionsSort);

  const splitFieldOptions: EuiComboBoxOptionOption[] = [
    ...allFieldOptions,
    ...createMlcategoryFieldOption(jobCreator.categorizationFieldName),
  ].sort(comboBoxOptionsSort);

  const eventRateField = fields.find((f) => f.id === EVENT_RATE_FIELD_ID);

  const onOptionChange = (func: (p: EuiComboBoxOptionOption) => any) => (
    selectedOptions: EuiComboBoxOptionOption[]
  ) => {
    func(selectedOptions[0] || emptyOption);
  };

  function getAgg(title: string) {
    return aggs.find((a) => a.id === title) || null;
  }
  function getField(title: string) {
    if (title === mlCategory.id) {
      return mlCategory;
    }
    return (
      fields.find((f) => f.id === title) ||
      jobCreator.additionalFields.find((f) => f.id === title) ||
      null
    );
  }

  useEffect(() => {
    const agg = getAgg(aggOption.label);
    let field = getField(fieldOption.label);
    const byField = getField(byFieldOption.label);
    const overField = getField(overFieldOption.label);
    const partitionField = getField(partitionFieldOption.label);

    if (agg !== null) {
      setCurrentFieldOptions(agg);

      if (isFieldlessAgg(agg) && eventRateField !== undefined) {
        setSplitFieldsEnabled(true);
        setFieldOption(emptyOption);
        setFieldOptionEnabled(false);
        field = eventRateField;
      } else {
        setSplitFieldsEnabled(field !== null);
        setFieldOptionEnabled(true);
      }
      // only enable exclude frequent if there is a by or over selected
      setExcludeFrequentEnabled(byField !== null || overField !== null);
    } else {
      setSplitFieldsEnabled(false);
      setFieldOptionEnabled(false);
    }

    const dtr: RichDetector = {
      agg,
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent: excludeFrequentOption.label !== '' ? excludeFrequentOption.label : null,
      description: descriptionOption !== '' ? descriptionOption : null,
      customRules: null,
    };
    setDetector(dtr);
    setDescriptionPlaceholder(dtr);
  }, [
    aggOption,
    fieldOption,
    byFieldOption,
    overFieldOption,
    partitionFieldOption,
    excludeFrequentOption,
    descriptionOption,
  ]);

  useEffect(() => {
    const agg = getAgg(aggOption.label);
    setSplitFieldsEnabled(aggOption.label !== '');
    if (agg !== null) {
      setFieldOptionEnabled(isFieldlessAgg(agg) === false);

      const byField = getField(byFieldOption.label);
      const overField = getField(overFieldOption.label);
      setExcludeFrequentEnabled(byField !== null || overField !== null);
    }
  }, []);

  useEffect(() => {
    // wipe the exclude frequent choice if the select has been disabled
    if (excludeFrequentEnabled === false) {
      setExcludeFrequentOption(emptyOption);
    }
  }, [excludeFrequentEnabled]);

  function onCreateClick() {
    detectorChangeHandler(detector, payload.index);
  }

  function saveEnabled() {
    return (
      splitFieldsEnabled &&
      (fieldOptionEnabled === false || (fieldOptionEnabled === true && fieldOption.label !== ''))
    );
  }

  return (
    <ModalWrapper onCreateClick={onCreateClick} closeModal={closeModal} saveEnabled={saveEnabled()}>
      <Fragment>
        <EuiFlexGroup>
          <EuiFlexItem data-test-subj="mlAdvancedFunctionSelect">
            <AggDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={aggOptions}
                selectedOptions={createSelectedOptions(aggOption, aggOptions)}
                onChange={onOptionChange(setAggOption)}
                isClearable={true}
              />
            </AggDescription>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="mlAdvancedFieldSelect">
            <FieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={currentFieldOptions}
                selectedOptions={createSelectedOptions(fieldOption, currentFieldOptions)}
                onChange={onOptionChange(setFieldOption)}
                isClearable={true}
                isDisabled={fieldOptionEnabled === false}
              />
            </FieldDescription>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="l" />
        <EuiFlexGrid columns={2}>
          <EuiFlexItem data-test-subj="mlAdvancedByFieldSelect">
            <ByFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={createSelectedOptions(byFieldOption, splitFieldOptions)}
                onChange={onOptionChange(setByFieldOption)}
                isClearable={true}
                isDisabled={splitFieldsEnabled === false}
              />
            </ByFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="mlAdvancedOverFieldSelect">
            <OverFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={createSelectedOptions(overFieldOption, splitFieldOptions)}
                onChange={onOptionChange(setOverFieldOption)}
                isClearable={true}
                isDisabled={splitFieldsEnabled === false}
              />
            </OverFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="mlAdvancedPartitionFieldSelect">
            <PartitionFieldDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={splitFieldOptions}
                selectedOptions={createSelectedOptions(partitionFieldOption, splitFieldOptions)}
                onChange={onOptionChange(setPartitionFieldOption)}
                isClearable={true}
                isDisabled={splitFieldsEnabled === false}
              />
            </PartitionFieldDescription>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="mlAdvancedExcludeFrequentSelect">
            <ExcludeFrequentDescription>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                options={excludeFrequentOptions}
                selectedOptions={createSelectedOptions(
                  excludeFrequentOption,
                  excludeFrequentOptions
                )}
                onChange={onOptionChange(setExcludeFrequentOption)}
                isClearable={true}
                isDisabled={splitFieldsEnabled === false || excludeFrequentEnabled === false}
              />
            </ExcludeFrequentDescription>
          </EuiFlexItem>
        </EuiFlexGrid>
        <EuiHorizontalRule margin="l" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <DescriptionDescription>
              <EuiTextArea
                rows={2}
                fullWidth={true}
                placeholder={descriptionPlaceholder}
                value={descriptionOption}
                onChange={(e) => setDescriptionOption(e.target.value)}
                data-test-subj="mlAdvancedDetectorDescriptionInput"
              />
            </DescriptionDescription>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    </ModalWrapper>
  );
};

function createAggOption(agg: Aggregation | null): EuiComboBoxOptionOption {
  if (agg === null) {
    return emptyOption;
  }
  return {
    label: agg.id,
  };
}

// get list of aggregations, filtering out any aggs with no fields,
// unless script fields are being used, in which case list all fields, as it's not possible
// to determine the type of a script field and so all aggs should be available.
function filterAggs(agg: Aggregation, usingScriptFields: boolean) {
  return agg.fields !== undefined && (usingScriptFields || agg.fields.length);
}

function createFieldOption(field: Field | null): EuiComboBoxOptionOption {
  if (field === null) {
    return emptyOption;
  }
  return {
    label: field.name,
  };
}

function createExcludeFrequentOption(excludeFrequent: string | null): EuiComboBoxOptionOption {
  if (excludeFrequent === null) {
    return emptyOption;
  }
  return {
    label: excludeFrequent,
  };
}

function isFieldlessAgg(agg: Aggregation) {
  // fieldless aggs have been given one event rate field for UI reasons.
  // therefore if an agg's field list only contains event rate, it must be
  // a fieldless agg.
  return agg.fields && agg.fields.length === 1 && agg.fields[0].id === EVENT_RATE_FIELD_ID;
}

function useDetectorPlaceholder(detector: RichDetector) {
  const [descriptionPlaceholder, setDescriptionPlaceholderString] = useState(
    createDefaultDescription(detector)
  );

  function setDescriptionPlaceholder(dtr: RichDetector) {
    setDescriptionPlaceholderString(createDefaultDescription(dtr));
  }

  return { descriptionPlaceholder, setDescriptionPlaceholder };
}

// creates list of combobox options based on an aggregation's field list
function createFieldOptionsFromAgg(agg: Aggregation | null, additionalFields: Field[]) {
  return createFieldOptions(
    agg !== null && agg.fields !== undefined ? agg.fields : [],
    additionalFields
  );
}

// custom hook for storing combobox options based on an aggregation field list
function useCurrentFieldOptions(
  aggregation: Aggregation | null,
  additionalFields: Field[],
  fields: Field[]
) {
  const [currentFieldOptions, setCurrentFieldOptions] = useState(
    createFieldOptionsFromAgg(aggregation, additionalFields)
  );

  return {
    currentFieldOptions,
    setCurrentFieldOptions: (agg: Aggregation | null) =>
      setCurrentFieldOptions(createFieldOptionsFromAgg(agg, additionalFields)),
  };
}

function createDefaultDescription(dtr: RichDetector) {
  if (dtr.agg === null || dtr.field === null) {
    return '';
  }
  const basicDetector = createBasicDetector(dtr.agg, dtr.field);
  basicDetector.by_field_name = dtr.byField ? dtr.byField.id : undefined;
  basicDetector.over_field_name = dtr.overField ? dtr.overField.id : undefined;
  basicDetector.partition_field_name = dtr.partitionField ? dtr.partitionField.id : undefined;
  basicDetector.exclude_frequent = dtr.excludeFrequent ? dtr.excludeFrequent : undefined;
  return detectorToString(basicDetector);
}

// fixes issue with EuiComboBox.
// if the options list only contains one option and nothing has been selected, set
// selectedOptions list to be an empty array
function createSelectedOptions(
  selectedOption: EuiComboBoxOptionOption,
  options: EuiComboBoxOptionOption[]
): EuiComboBoxOptionOption[] {
  return (options.length === 1 && options[0].label !== selectedOption.label) ||
    selectedOption.label === ''
    ? []
    : [selectedOption];
}

function comboBoxOptionsSort(a: EuiComboBoxOptionOption, b: EuiComboBoxOptionOption) {
  return a.label.localeCompare(b.label);
}
