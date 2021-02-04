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
import { i18n } from '@kbn/i18n';

interface Option {
  value: string;
  selected: boolean;
}

interface Props {
  label: string;
  options: Option[];
  showMore: boolean;
  onMoreClick(): void;
  onRemove(id: string): void;
  onSelect(id: string): void;
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

  const optionToCheckBoxGroupOption = (option: Option, index: number) => ({
    id: getId(String(index)),
    label:
      option.value ||
      i18n.translate(
        'xpack.enterpriseSearch.appSearch.documents.search.multiCheckboxFacetsView.noValue.selectOption',
        {
          defaultMessage: '<No value>',
        }
      ),
  });

  const optionToSelectedMapReducer = (
    selectedMap: { [name: string]: boolean },
    option: Option,
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
      onRemove(option.value);
      return;
    }
    onSelect(option.value);
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
        compressed={true}
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
