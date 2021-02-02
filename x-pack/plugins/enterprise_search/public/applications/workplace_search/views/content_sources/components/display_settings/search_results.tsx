/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiColorPicker,
  EuiFlexGrid,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { DisplaySettingsLogic } from './display_settings_logic';

import { DESCRIPTION_LABEL } from '../../../../constants';
import {
  LEAVE_UNASSIGNED_FIELD,
  SEARCH_RESULTS_TITLE,
  SEARCH_RESULTS_ROW_HELP_TEXT,
  PREVIEW_TITLE,
  FEATURED_RESULTS_TITLE,
  FEATURED_RESULTS_DESCRIPTION,
  STANDARD_RESULTS_TITLE,
  STANDARD_RESULTS_DESCRIPTION,
} from './constants';

import { ExampleSearchResultGroup } from './example_search_result_group';
import { ExampleStandoutResult } from './example_standout_result';

export const SearchResults: React.FC = () => {
  const {
    toggleTitleFieldHover,
    toggleSubtitleFieldHover,
    toggleDescriptionFieldHover,
    setTitleField,
    setSubtitleField,
    setDescriptionField,
    setUrlField,
    setColorField,
  } = useActions(DisplaySettingsLogic);

  const {
    searchResultConfig: { titleField, descriptionField, subtitleField, urlField, color },
    fieldOptions,
    optionalFieldOptions,
  } = useValues(DisplaySettingsLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="s">
            <h3>{SEARCH_RESULTS_TITLE}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiForm>
            <EuiFormRow
              label="Title"
              onMouseOver={toggleTitleFieldHover}
              onMouseOut={toggleTitleFieldHover}
              onFocus={toggleTitleFieldHover}
              onBlur={toggleTitleFieldHover}
            >
              <EuiSelect
                options={fieldOptions}
                required={true}
                name="titleField"
                className="field-selector"
                hasNoInitialSelection={true}
                data-test-subj="TitleFieldSelect"
                value={titleField || ''}
                onChange={(e) => setTitleField(e.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label="URL">
              <EuiSelect
                options={fieldOptions}
                required={true}
                className="field-selector"
                hasNoInitialSelection={true}
                data-test-subj="UrlFieldSelect"
                value={urlField || ''}
                onChange={(e) => setUrlField(e.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label="Color">
              <EuiColorPicker color={color} onChange={setColorField} />
            </EuiFormRow>
            <EuiFormRow
              label="Subtitle"
              helpText={SEARCH_RESULTS_ROW_HELP_TEXT}
              onMouseOver={toggleSubtitleFieldHover}
              onMouseOut={toggleSubtitleFieldHover}
              onFocus={toggleSubtitleFieldHover}
              onBlur={toggleSubtitleFieldHover}
            >
              <EuiSelect
                options={optionalFieldOptions}
                className="field-selector"
                hasNoInitialSelection={true}
                data-test-subj="SubtitleFieldSelect"
                value={subtitleField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setSubtitleField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
                }
              />
            </EuiFormRow>
            <EuiFormRow
              label={DESCRIPTION_LABEL}
              helpText={SEARCH_RESULTS_ROW_HELP_TEXT}
              onMouseOver={toggleDescriptionFieldHover}
              onMouseOut={toggleDescriptionFieldHover}
              onFocus={toggleDescriptionFieldHover}
              onBlur={toggleDescriptionFieldHover}
            >
              <EuiSelect
                options={optionalFieldOptions}
                className="field-selector"
                hasNoInitialSelection={true}
                data-test-subj="DescriptionFieldSelect"
                value={descriptionField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setDescriptionField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
                }
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel>
            <EuiTitle size="s">
              <h3>{PREVIEW_TITLE}</h3>
            </EuiTitle>
            <EuiSpacer />
            <div className="section-header">
              <EuiTitle size="xs">
                <h4>{FEATURED_RESULTS_TITLE}</h4>
              </EuiTitle>
              <p className="section-header__description">{FEATURED_RESULTS_DESCRIPTION}</p>
            </div>
            <EuiSpacer />
            <ExampleStandoutResult />
            <EuiSpacer />
            <div className="section-header">
              <EuiTitle size="xs">
                <h4>{STANDARD_RESULTS_TITLE}</h4>
              </EuiTitle>
              <p className="section-header__description">{STANDARD_RESULTS_DESCRIPTION}</p>
            </div>
            <EuiSpacer />
            <ExampleSearchResultGroup />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
