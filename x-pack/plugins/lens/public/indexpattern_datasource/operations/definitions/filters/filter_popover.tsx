/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './filter_popover.scss';

import React from 'react';
import { EuiPopover, EuiSpacer } from '@elastic/eui';
import { FilterValue, defaultLabel, isQueryValid } from '.';
import { IndexPattern } from '../../../types';
import { Query } from '../../../../../../../../src/plugins/data/public';
import { LabelInput } from '../shared_components';
import { QueryInput } from '../../../query_input';

export const FilterPopover = ({
  filter,
  setFilter,
  indexPattern,
  Button,
  isOpen,
  triggerClose,
}: {
  filter: FilterValue;
  setFilter: Function;
  indexPattern: IndexPattern;
  Button: React.FunctionComponent;
  isOpen: boolean;
  triggerClose: () => void;
}) => {
  const inputRef = React.useRef<HTMLInputElement>();

  // The following code is to prevent an <ESCAPE> keypress
  // from propagating.
  //
  // TODO - It looks like EUI should be handling this
  // (see https://github.com/elastic/eui/commit/ad97583b0d644690379f72c7a20879cfadb16e7a)
  const popoverRef = React.useRef<EuiPopover>(null);
  let panelElement: HTMLDivElement;
  const panelRefCallback = (element: HTMLDivElement) => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        panelElement.removeEventListener('keydown', listener);
        popoverRef.current?.closePopover();
      }
    };

    if (element) {
      panelElement = element;
      panelElement.addEventListener('keydown', listener);
    }
  };
  // End <ESCAPE> handling code

  const setFilterLabel = (label: string) => setFilter({ ...filter, label });
  const setFilterQuery = (input: Query) => setFilter({ ...filter, input });

  const getPlaceholder = (query: Query['query']) => {
    if (query === '') {
      return defaultLabel;
    }
    if (query === 'object') return JSON.stringify(query);
    else {
      return String(query);
    }
  };

  return (
    <EuiPopover
      ref={popoverRef}
      panelRef={panelRefCallback}
      data-test-subj="indexPattern-filters-existingFilterContainer"
      anchorClassName="eui-fullWidth"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      isOpen={isOpen}
      ownFocus
      closePopover={() => triggerClose()}
      button={<Button />}
    >
      <QueryInput
        isInvalid={!isQueryValid(filter.input, indexPattern)}
        value={filter.input}
        indexPatternTitle={indexPattern.title}
        onChange={setFilterQuery}
        onSubmit={() => {
          if (inputRef.current) inputRef.current.focus();
        }}
      />
      <EuiSpacer size="s" />
      <LabelInput
        value={filter.label || ''}
        onChange={setFilterLabel}
        placeholder={getPlaceholder(filter.input.query)}
        inputRef={inputRef}
        onSubmit={() => triggerClose()}
        dataTestSubj="indexPattern-filters-label"
      />
    </EuiPopover>
  );
};
