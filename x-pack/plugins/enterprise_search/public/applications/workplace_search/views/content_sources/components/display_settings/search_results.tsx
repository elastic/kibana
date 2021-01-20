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
import { LEAVE_UNASSIGNED_FIELD } from './constants';

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
            <h3>Search Result Settings</h3>
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
              helpText="This area is optional"
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
              label="Description"
              helpText="This area is optional"
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
              <h3>Preview</h3>
            </EuiTitle>
            <EuiSpacer />
            <div className="section-header">
              <EuiTitle size="xs">
                <h4>Featured Results</h4>
              </EuiTitle>
              <p className="section-header__description">
                A matching document will appear as a single bold card.
              </p>
            </div>
            <EuiSpacer />
            <ExampleStandoutResult />
            <EuiSpacer />
            <div className="section-header">
              <EuiTitle size="xs">
                <h4>Standard Results</h4>
              </EuiTitle>
              <p className="section-header__description">
                Somewhat matching documents will appear as a set.
              </p>
            </div>
            <EuiSpacer />
            <ExampleSearchResultGroup />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
