/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiComboBox,
  EuiButton,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../../engine';
import { SearchUILogic } from '../search_ui_logic';
import { ActiveField } from '../types';
import { generatePreviewUrl } from '../utils';

const TITLE_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldLabel',
  { defaultMessage: 'Title field (Optional)' }
);
const TITLE_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldHelpText',
  { defaultMessage: 'Used as the top-level visual identifier for every rendered result' }
);
const TITLE_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.titleFieldPlaceholder',
  { defaultMessage: 'Select a title field' }
);
const FILTER_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldLabel',
  { defaultMessage: 'Filter fields (Optional)' }
);
const FILTER_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldHelpText',
  { defaultMessage: 'Faceted values rendered as filters and available as query refinement' }
);
const FILTER_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.filterFieldPlaceholder',
  { defaultMessage: 'Click to select' }
);
const SORT_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortFieldLabel',
  { defaultMessage: 'Sort fields (Optional)' }
);
const SORT_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortHelpText',
  { defaultMessage: 'Used to display result sorting options, ascending and descending' }
);
const SORT_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.sortFieldPlaceholder',
  { defaultMessage: 'Click to select' }
);
const URL_FIELD_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldLabel',
  { defaultMessage: 'URL field (Optional)' }
);
const URL_FIELD_HELP_TEXT = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldHelpText',
  { defaultMessage: "Used as a result's link target, if applicable" }
);
const URL_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.urlFieldPlaceholder',
  { defaultMessage: 'Select a URL field' }
);
const GENERATE_PREVIEW_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.engine.searchUI.generatePreviewButtonLabel',
  { defaultMessage: 'Generate a Preview' }
);

interface Option<T> extends Omit<EuiComboBoxOptionOption<T>, 'value'> {
  value: string;
}

export const SearchUIForm: React.FC = () => {
  const {
    validFields,
    validSortFields,
    validFacetFields,
    titleField,
    urlField,
    facetFields,
    sortFields,
  } = useValues(SearchUILogic);
  const { engineName } = useValues(EngineLogic);
  const {
    onActiveFieldChange,
    onFacetFieldsChange,
    onSortFieldsChange,
    onTitleFieldChange,
    onUrlFieldChange,
  } = useActions(SearchUILogic);

  const previewHref = generatePreviewUrl(
    {
      fromKibana: 'true',
      titleField,
      urlField,
      facets: facetFields,
      sortFields,
    },
    engineName
  );

  const formatSelectOption = (fieldName: string) => {
    return { text: fieldName, value: fieldName };
  };
  const formatMultiOptions = (fieldNames: string[]) =>
    fieldNames.map((fieldName) => ({ label: fieldName, text: fieldName, value: fieldName }));
  const formatMultiOptionsWithEmptyOption = (fieldNames: string[]) => [
    { label: '', text: '', value: '' },
    ...formatMultiOptions(fieldNames),
  ];

  const optionFields = formatMultiOptionsWithEmptyOption(validFields);
  const sortOptionFields = formatMultiOptions(validSortFields);
  const facetOptionFields = formatMultiOptions(validFacetFields);
  const selectedTitleOption = formatSelectOption(titleField);
  const selectedURLOption = formatSelectOption(urlField);
  const selectedSortOptions = formatMultiOptions(sortFields);
  const selectedFacetOptions = formatMultiOptions(facetFields);

  return (
    <div>
      <EuiForm>
        <EuiFormRow label={TITLE_FIELD_LABEL} helpText={TITLE_FIELD_HELP_TEXT} fullWidth>
          <EuiSelect
            name="title-field"
            options={optionFields}
            value={selectedTitleOption && selectedTitleOption.value}
            onChange={(e) => onTitleFieldChange(e.target.value)}
            fullWidth
            placeholder={TITLE_FIELD_PLACEHOLDER}
            onFocus={() => onActiveFieldChange(ActiveField.Title)}
            onBlur={() => onActiveFieldChange(ActiveField.None)}
            hasNoInitialSelection
            data-test-subj="selectTitle"
          />
        </EuiFormRow>
        <EuiFormRow label={FILTER_FIELD_LABEL} helpText={FILTER_FIELD_HELP_TEXT} fullWidth>
          <EuiComboBox
            options={facetOptionFields}
            selectedOptions={selectedFacetOptions}
            onChange={(newValues) =>
              onFacetFieldsChange(newValues.map((field) => (field as Option<string>).value))
            }
            onFocus={() => onActiveFieldChange(ActiveField.Filter)}
            onBlur={() => onActiveFieldChange(ActiveField.None)}
            fullWidth
            placeholder={FILTER_FIELD_PLACEHOLDER}
            data-test-subj="selectFilters"
          />
        </EuiFormRow>
        <EuiFormRow label={SORT_FIELD_LABEL} helpText={SORT_FIELD_HELP_TEXT} fullWidth>
          <EuiComboBox
            options={sortOptionFields}
            selectedOptions={selectedSortOptions}
            onChange={(newValues) =>
              onSortFieldsChange(newValues.map((field) => (field as Option<string>).value))
            }
            onFocus={() => onActiveFieldChange(ActiveField.Sort)}
            onBlur={() => onActiveFieldChange(ActiveField.None)}
            fullWidth
            placeholder={SORT_FIELD_PLACEHOLDER}
            data-test-subj="selectSort"
          />
        </EuiFormRow>

        <EuiFormRow label={URL_FIELD_LABEL} helpText={URL_FIELD_HELP_TEXT} fullWidth>
          <EuiSelect
            name="url-field"
            options={optionFields}
            value={selectedURLOption && selectedURLOption.value}
            onChange={(e) => onUrlFieldChange(e.target.value)}
            fullWidth
            placeholder={URL_FIELD_PLACEHOLDER}
            onFocus={() => onActiveFieldChange(ActiveField.Url)}
            onBlur={() => onActiveFieldChange(ActiveField.None)}
            hasNoInitialSelection
            data-test-subj="selectUrl"
          />
        </EuiFormRow>
        <EuiButton
          href={previewHref}
          target="_blank"
          fill
          iconType="popout"
          iconSide="right"
          data-test-subj="generateReferenceUiPreview"
        >
          {GENERATE_PREVIEW_BUTTON_LABEL}
        </EuiButton>
      </EuiForm>
    </div>
  );
};
