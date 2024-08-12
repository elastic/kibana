/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  htmlIdGenerator,
  EuiCheckboxGroup,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import type { FieldValue, FacetValue } from '@elastic/search-ui';
import { i18n } from '@kbn/i18n';

interface Props {
  label: string;
  options: FacetValue[];
  showMore: boolean;
  onMoreClick(): void;
  onRemove(value: FieldValue): void;
  onSelect(value: FieldValue): void;
}

const getIndexFromId = (id: string) => parseInt(id.split('_')[1], 10);

export const MultiCheckboxFacetsView: React.FC<Props> = ({
  label,
  onMoreClick,
  onRemove,
  onSelect,
  options,
  showMore,
}) => {
  const getId = htmlIdGenerator();

  const optionToCheckBoxGroupOption = (option: FacetValue, index: number) => ({
    id: getId(String(index)),
    label:
      option.value ||
      i18n.translate(
        'xpack.enterpriseSearch.appSearch.documents.search.multiCheckboxFacetsView.noValue.selectOption',
        {
          defaultMessage: '<No value>',
          ignoreTag: true,
        }
      ),
  });

  const optionToSelectedMapReducer = (
    selectedMap: { [name: string]: boolean },
    option: FacetValue,
    index: number
  ) => {
    if (option.selected) {
      selectedMap[getId(String(index))] = true;
    }
    return selectedMap;
  };

  const checkboxGroupOptions = options.map(optionToCheckBoxGroupOption);
  const idToSelectedMap = options.reduce(optionToSelectedMapReducer, {});

  const onChange = (checkboxId: string) => {
    const index = getIndexFromId(checkboxId);
    const option = options[index];
    if (option.selected) {
      onRemove(option.value as FieldValue);
      return;
    }
    onSelect(option.value as FieldValue);
  };

  return (
    <>
      <EuiCheckboxGroup
        data-test-subj="checkbox-group"
        className="documentsSearchExperience__facet"
        legend={{ children: label }}
        options={checkboxGroupOptions}
        idToSelectedMap={idToSelectedMap}
        onChange={onChange}
      />
      {showMore && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="row" justifyContent="center">
            <EuiButtonEmpty
              data-test-subj="more"
              onClick={onMoreClick}
              iconSide="right"
              iconType="arrowDown"
              size="xs"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documents.search.multiCheckboxFacetsView.showMore',
                {
                  defaultMessage: 'Show more',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
