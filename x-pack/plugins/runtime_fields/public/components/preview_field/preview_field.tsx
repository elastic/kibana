/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
} from '@elastic/eui';
import { DataPublicPluginStart } from 'src/plugins/data/public';

import { RuntimeField } from '../../types';
import { PreviewTable } from './preview_table';
import { parseSearchResponse } from './lib';

export interface Props {
  /**
   * The current runtime field beeing created/edited
   */
  runtimeField?: RuntimeField;
  /**
   * Data plugin start "search" service.
   * If it is not provided, the "Preview field" section is disabled.
   */
  search: DataPublicPluginStart['search'];
  /**
   * The index or indices to search with the current runtime field
   */
  index: string | string[];
  /** Current search request body context.*/
  searchRequestBody?: { [key: string]: any };
}

export interface Document {
  _id: string;
  _index: string;
  uuid: string;
  fields: { [key: string]: unknown[] };
}

export interface SearchResult {
  fieldNames: string[];
  documents: Document[];
}

const EMPTY_SEARCH_RESULT = {
  total: 0,
  fieldNames: [],
  documents: [],
};

const PreviewFieldComp = ({
  runtimeField,
  index,
  searchRequestBody,
  search: searchService,
}: Props) => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<SearchResult>(EMPTY_SEARCH_RESULT);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    runtimeField ? [runtimeField.name] : []
  );

  const availableFields: Array<ComboBoxOption<string>> = searchResult.fieldNames
    .filter((name) => !selectedFields.includes(name))
    .map((name) => {
      return {
        label: name,
        value: name,
      };
    });

  const canAddMoreField = selectedFields.length < searchResult.fieldNames.length;

  const sendQuery = useCallback(async () => {
    if (!runtimeField) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSearchResult(EMPTY_SEARCH_RESULT);

    const { name, ...rest } = runtimeField;

    try {
      const result = await searchService
        .search({
          params: {
            index,
            body: {
              ...searchRequestBody,
              runtime_mappings: {
                [name]: {
                  ...rest,
                },
              },
              fields: ['*'],
            },
          },
        })
        .toPromise();

      setSearchResult(parseSearchResponse(result));
    } catch (e) {
      // console.log('Error!');
      // console.log(e.body.attributes.error);
    }

    setIsLoading(false);
  }, [searchService, runtimeField, index, searchRequestBody]);

  useDebounce(sendQuery, 500, [sendQuery]);

  return isLoading ? (
    <div>Loading...</div>
  ) : (
    <>
      <EuiHorizontalRule />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>Preview</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          {canAddMoreField && (
            <EuiComboBox<string>
              placeholder={i18n.translate(
                'xpack.runtimeFields.editor.previewField.addFieldPlaceholderLabel',
                {
                  defaultMessage: 'Add a field',
                }
              )}
              singleSelection={{ asPlainText: true }}
              options={availableFields}
              selectedOptions={undefined}
              onChange={(newValue) => {
                if (newValue.length === 0) {
                  // Don't allow clearing the type. One must always be selected
                  return;
                }

                setSelectedFields((prev) => [...prev, newValue[0].value!]);
              }}
              isClearable={false}
              aria-label={i18n.translate(
                'xpack.runtimeFields.editor.previewField.addFieldAriaLabel',
                {
                  defaultMessage: 'Add field',
                }
              )}
              fullWidth
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <PreviewTable
        runtimeField={runtimeField}
        selectedFields={selectedFields}
        searchResult={searchResult}
        removeSelectedField={(fieldName) => {
          setSelectedFields((prev) => prev.filter((name) => name !== fieldName));
        }}
      />

      <EuiSpacer />
    </>
  );
};

export const PreviewField = React.memo(PreviewFieldComp);
