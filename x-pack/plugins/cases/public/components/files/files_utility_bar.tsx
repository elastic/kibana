/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEqual } from 'lodash';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { FC } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiPopover,
} from '@elastic/eui';
import { AddFile } from './add_file';

import * as i18n from './translations';
import {
  compressionMimeTypes,
  imageMimeTypes,
  pdfMimeTypes,
  textMimeTypes,
} from '../../../common/constants/mime_types';

interface FilesUtilityBarProps {
  caseId: string;
  onSearch: (newSearch: string) => void;
  onSearchType: (newSearch: string[]) => void;
}

interface TypeFilterPanelProps {
  onSearchType: (value: string[]) => void;
}

interface ItemProps {
  label: string;
  checked: boolean;
  values: string[];
}

type SelectedTypeProps = Omit<ItemProps, 'checked'>;

export const TypeFilterPanel: FC<TypeFilterPanelProps> = ({ onSearchType }) => {
  const [isPopoverOpen, setPopoverStatus] = useState<boolean>(false);
  const initialTypes = [
    { label: i18n.COMPRESSED_MIME_TYPE, checked: false, values: compressionMimeTypes },
    { label: i18n.IMAGE_MIME_TYPE, checked: false, values: imageMimeTypes },
    { label: i18n.PDF_MIME_TYPE, checked: false, values: pdfMimeTypes },
    { label: i18n.TEXT_MIME_TYPE, checked: false, values: textMimeTypes },
  ];

  const [types, setTypes] = useState<ItemProps[]>(initialTypes);

  const changeItemStatus = (item: ItemProps) => {
    const updatedFilters: ItemProps[] = types.map((filter) => {
      if (filter.label === item.label) {
        return { ...filter, checked: !item.checked };
      }
      return filter;
    });

    setTypes(updatedFilters);
  };

  const [selectedTypes, setSelectedTypes] = useState<SelectedTypeProps[]>([]);

  const handleSelectedTypes = useCallback(
    (selectedType: SelectedTypeProps) => {
      setSelectedTypes((prevState) => {
        const isTypeSelected = prevState.some((type) => isEqual(type, selectedType));

        if (isTypeSelected) {
          return prevState.filter((state) => !isEqual(state, selectedType));
        } else {
          return [...prevState, selectedType];
        }
      });
    },
    [setSelectedTypes]
  );

  const handleSearchParam = useMemo(() => {
    if (selectedTypes.length > 0) {
      return selectedTypes.flatMap((type) => type.values);
    }
    return [];
  }, [selectedTypes]);

  const activeFiltersCount = types.filter((itemFilter) => itemFilter.checked).length;

  useEffect(() => {
    onSearchType(handleSearchParam);
  }, [onSearchType, handleSearchParam]);

  return (
    <EuiFilterGroup>
      <EuiPopover
        ownFocus
        button={
          <EuiFilterButton
            iconType="arrowDown"
            onClick={() => setPopoverStatus((prevState) => !prevState)}
            hasActiveFilters={activeFiltersCount > 0}
            numActiveFilters={activeFiltersCount}
            numFilters={types.length}
            data-test-subj="cases-files-filter-type"
          >
            {i18n.TYPE}
          </EuiFilterButton>
        }
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverStatus(false)}
        panelPaddingSize="none"
      >
        <div className="euiFilterSelect__items">
          {types.map((filter, index) => {
            const selected = { label: filter.label, values: filter.values };

            const handleClick = async () => {
              changeItemStatus(filter);
              handleSelectedTypes(selected);
            };

            return (
              <EuiFilterSelectItem
                key={index}
                checked={filter.checked ? 'on' : undefined}
                onClick={handleClick}
                data-test-subj={`cases-files-filter-type-${filter.label}`}
              >
                {filter.label}
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};

TypeFilterPanel.displayName = 'TypeFilterPanel';

export const FilesUtilityBar = ({ caseId, onSearch, onSearchType }: FilesUtilityBarProps) => {
  return (
    <EuiFlexGroup alignItems="center">
      <AddFile caseId={caseId} />
      <EuiFlexItem grow={false} style={{ minWidth: 400 }}>
        <EuiFieldSearch
          fullWidth
          placeholder={i18n.SEARCH_PLACEHOLDER}
          onSearch={onSearch}
          incremental={false}
          data-test-subj="cases-files-search"
        />
      </EuiFlexItem>
      <TypeFilterPanel onSearchType={onSearchType} />
    </EuiFlexGroup>
  );
};

FilesUtilityBar.displayName = 'FilesUtilityBar';
