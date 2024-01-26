/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './filter_popover.scss';

import React from 'react';
import { EuiPopover, EuiSpacer } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
// Need to keep it separate to make it work Jest mocks in dimension_panel tests
// import { QueryInput } from '../../../../shared_components/query_input';
import { isQueryValid, QueryInput } from '@kbn/visualization-ui-components';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LENS_APP_NAME } from '../../../../../../common/constants';
import { IndexPattern } from '../../../../../types';
import { FilterValue, defaultLabel } from '.';
import { LabelInput } from '../shared_components';
import { LensAppServices } from '../../../../../app_plugin/types';

export const FilterPopover = ({
  filter,
  setFilter,
  indexPattern,
  button,
  isOpen,
  triggerClose,
}: {
  filter: FilterValue;
  setFilter: Function;
  indexPattern: IndexPattern;
  button: React.ReactChild;
  isOpen: boolean;
  triggerClose: () => void;
}) => {
  const inputRef = React.useRef<HTMLInputElement>();

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
      data-test-subj="indexPattern-filters-existingFilterContainer"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      isOpen={isOpen}
      ownFocus
      closePopover={triggerClose}
      button={button}
    >
      <QueryInput
        isInvalid={!isQueryValid(filter.input, indexPattern)}
        value={filter.input}
        dataView={
          indexPattern.id
            ? { type: 'id', value: indexPattern.id }
            : { type: 'title', value: indexPattern.title }
        }
        disableAutoFocus
        onChange={setFilterQuery}
        onSubmit={() => {
          if (inputRef.current) inputRef.current.focus();
        }}
        appName={LENS_APP_NAME}
        services={useKibana<LensAppServices>().services}
      />
      <EuiSpacer size="s" />
      <LabelInput
        value={filter.label || ''}
        onChange={setFilterLabel}
        placeholder={getPlaceholder(filter.input.query)}
        inputRef={inputRef}
        onSubmit={triggerClose}
        dataTestSubj="indexPattern-filters-label"
      />
    </EuiPopover>
  );
};
