/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

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
import { DisplaySettingsLogic } from './display_settings_logic';
import { ExampleSearchResultGroup } from './example_search_result_group';
import { ExampleStandoutResult } from './example_standout_result';

export const SearchResults: React.FC = () => {
  const {
    toggleTitleFieldHover,
    toggleSubtitleFieldHover,
    toggleDescriptionFieldHover,
    toggleTypeFieldHover,
    toggleMediaTypeFieldHover,
    toggleCreatedByFieldHover,
    toggleUpdatedByFieldHover,
    setTitleField,
    setSubtitleField,
    setDescriptionField,
    setTypeField,
    setMediaTypeField,
    setCreatedByField,
    setUpdatedByField,
    setUrlField,
    setColorField,
  } = useActions(DisplaySettingsLogic);

  const {
    searchResultConfig: {
      titleField,
      descriptionField,
      subtitleField,
      typeField,
      mediaTypeField,
      createdByField,
      updatedByField,
      urlField,
      color,
    },
    fieldOptions,
    optionalFieldOptions,
  } = useValues(DisplaySettingsLogic);

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
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
                required
                name="titleField"
                className="field-selector"
                hasNoInitialSelection
                data-test-subj="TitleFieldSelect"
                value={titleField || ''}
                onChange={(e) => setTitleField(e.target.value)}
              />
            </EuiFormRow>
            <EuiFormRow label="URL">
              <EuiSelect
                options={fieldOptions}
                required
                className="field-selector"
                hasNoInitialSelection
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
                hasNoInitialSelection
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
                hasNoInitialSelection
                data-test-subj="DescriptionFieldSelect"
                value={descriptionField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setDescriptionField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
                }
              />
            </EuiFormRow>
            <EuiFormRow
              label="Type"
              helpText="This area is optional"
              onMouseOver={toggleTypeFieldHover}
              onFocus={toggleTypeFieldHover}
              onMouseOut={toggleTypeFieldHover}
              onBlur={toggleTypeFieldHover}
            >
              <EuiSelect
                options={optionalFieldOptions}
                className="field-selector"
                hasNoInitialSelection
                data-test-subj="TypeFieldSelect"
                value={typeField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setTypeField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
                }
              />
            </EuiFormRow>
            <EuiFormRow
              label="Media Type"
              helpText="This area is optional"
              onMouseOver={toggleMediaTypeFieldHover}
              onFocus={toggleMediaTypeFieldHover}
              onMouseOut={toggleMediaTypeFieldHover}
              onBlur={toggleMediaTypeFieldHover}
            >
              <EuiSelect
                options={optionalFieldOptions}
                className="field-selector"
                hasNoInitialSelection
                data-test-subj="MediaTypeFieldSelect"
                value={mediaTypeField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setMediaTypeField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
                }
              />
            </EuiFormRow>
            <EuiFormRow
              label="Created By"
              helpText="This area is optional"
              onMouseOver={toggleCreatedByFieldHover}
              onFocus={toggleCreatedByFieldHover}
              onMouseOut={toggleCreatedByFieldHover}
              onBlur={toggleCreatedByFieldHover}
            >
              <EuiSelect
                options={optionalFieldOptions}
                className="field-selector"
                hasNoInitialSelection
                data-test-subj="CreatedByFieldSelect"
                value={createdByField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setCreatedByField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
                }
              />
            </EuiFormRow>
            <EuiFormRow
              label="Updated By"
              helpText="This area is optional"
              onMouseOver={toggleUpdatedByFieldHover}
              onFocus={toggleUpdatedByFieldHover}
              onMouseOut={toggleUpdatedByFieldHover}
              onBlur={toggleUpdatedByFieldHover}
            >
              <EuiSelect
                options={optionalFieldOptions}
                className="field-selector"
                hasNoInitialSelection
                data-test-subj="UpdatedByFieldSelect"
                value={updatedByField || LEAVE_UNASSIGNED_FIELD}
                onChange={({ target: { value } }) =>
                  setUpdatedByField(value === LEAVE_UNASSIGNED_FIELD ? null : value)
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
      </EuiFlexGroup>
    </>
  );
};
