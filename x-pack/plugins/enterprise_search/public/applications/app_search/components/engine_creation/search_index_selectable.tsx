/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiSelectable,
  EuiPanel,
  EuiFormRow,
  EuiHighlight,
  EuiIcon,
  EuiSpacer,
  EuiTextColor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineCreationLogic } from './engine_creation_logic';

import './search_index_selectable.scss';

export type HealthStrings = 'red' | 'green' | 'yellow' | 'unavailable';
export interface SearchIndexSelectableOption {
  label: string;
  health: HealthStrings;
  status?: string;
  total: {
    docs: {
      count: number;
      deleted: number;
    };
    store: {
      size_in_bytes: string;
    };
  };
  checked?: 'on';
}

const healthColorsMap = {
  red: 'danger',
  green: 'success',
  yellow: 'warning',
  unavailable: '',
};

const renderIndexOption = (option: SearchIndexSelectableOption, searchValue: string) => {
  return (
    <>
      <EuiHighlight search={searchValue}>{option.label ?? ''}</EuiHighlight>
      <EuiSpacer size="xs" />
      <EuiTextColor color="subdued">
        <small>
          <span className="selectableSecondaryContentLabel">
            <EuiIcon type="dot" color={healthColorsMap[option.health] ?? ''} />
            &nbsp;{option.health ?? '-'}
          </span>
          <span className="selectableSecondaryContentLabel" data-test-subj="optionStatus">
            <b>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.status',
                {
                  defaultMessage: 'Status:',
                }
              )}
            </b>
            &nbsp;{option.status ?? '-'}
          </span>
          <span className="selectableSecondaryContentLabel" data-test-subj="optionDocs">
            <b>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.docCount',
                {
                  defaultMessage: 'Docs count:',
                }
              )}
            </b>
            &nbsp;{option.total?.docs?.count ?? '-'}
          </span>
          <span className="selectableSecondaryContentLabel" data-test-subj="optionStorage">
            <b>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.storage',
                {
                  defaultMessage: 'Storage size:',
                }
              )}
            </b>
            &nbsp;{option.total?.store?.size_in_bytes ?? '-'}
          </span>
        </small>
      </EuiTextColor>
    </>
  );
};

export const SearchIndexSelectable: React.FC = () => {
  const { indicesFormatted, isLoadingIndices } = useValues(EngineCreationLogic);
  const { loadIndices, setSelectedIndex } = useActions(EngineCreationLogic);

  const onChange = (options: SearchIndexSelectableOption[]) => {
    const selected = options.find((option) => option.checked === 'on');
    setSelectedIndex(selected?.label ?? '');
  };

  useEffect(() => {
    loadIndices();
  }, []);

  return (
    <EuiPanel hasBorder>
      <EuiFormRow
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engineCreation.searchIndexSelectable.label',
          { defaultMessage: 'Select an Elasticsearch index to use' }
        )}
        helpText={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engineCreation.searchIndexSelectable.helpText',
          { defaultMessage: "Only indices aliased with 'search-' can be selected" }
        )}
        fullWidth
      >
        <EuiSelectable
          searchable
          options={indicesFormatted}
          singleSelection
          aria-label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.indexSelectorAriaLabel',
            {
              defaultMessage: 'Select and Elasticsearch index',
            }
          )}
          isLoading={isLoadingIndices}
          listProps={{ bordered: true, rowHeight: 56 }}
          onChange={onChange}
          loadingMessage={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.selectable.loading',
            {
              defaultMessage: 'Loading Elasticsearch indices',
            }
          )}
          emptyMessage={i18n.translate(
            'xpack.enterpriseSearch.appSearch.documentCreation.elasticsearchIndex.selectable.empty',
            { defaultMessage: 'No Elasticsearch indices available' }
          )}
          renderOption={renderIndexOption}
          data-test-subj="SearchIndexSelectable"
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      </EuiFormRow>
    </EuiPanel>
  );
};
