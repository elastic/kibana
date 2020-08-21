/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useRef, MouseEventHandler } from 'react';
import { EuiPopover, EuiFieldText, EuiForm, EuiFormRow, keys, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  QueryStringInput,
  Query,
  esKuery,
  esQuery,
} from '../../../../../../../../src/plugins/data/public';

export enum SEARCH_QUERY_LANGUAGE {
  KUERY = 'kuery',
  LUCENE = 'lucene',
}

export interface ErrorMessage {
  query: string;
  message: string;
}

const emptyFilter = {
  input: {
    query: '',
    language: SEARCH_QUERY_LANGUAGE.KUERY,
  },
  label: '',
};

export const FilterPopover = ({ filter, setFilter, indexPattern, Button }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState(filter);
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  const labelRef = useRef<HTMLInputElement>();
  const onQueryChange = (input: Query) => setTempFilter({ ...tempFilter, input });
  const onLabelChange = (label: string) => setTempFilter({ ...tempFilter, label });
  const onSubmit = (input: Query) => {
    let filterQuery;
    // try {
    if (input.language === SEARCH_QUERY_LANGUAGE.KUERY) {
      filterQuery = esKuery.toElasticsearchQuery(
        esKuery.fromKueryExpression(input.query),
        indexPattern
      );
    } else if (input.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
      filterQuery = esQuery.luceneStringToDsl(input.query);
    } else {
      filterQuery = {};
    }
    if (input.query.length) {
      if (tempFilter.label) {
        setFilter(tempFilter);
        setIsPopoverOpen(false);
      } else {
        if (labelRef?.current?.focus) {
          labelRef.current.focus();
        }
      }
    }
  };

  return (
    <EuiPopover
      anchorClassName="lnsLayerPanel__anchor"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        setTempFilter(filter);
      }}
      button={<Button onClick={() => setIsPopoverOpen((open) => !open)} />}
    >
      <EuiForm>
        <EuiFormRow fullWidth>
          <QueryStringInput
            bubbleSubmitEvent={true}
            indexPatterns={[indexPattern]}
            query={tempFilter.input}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            placeholder={
              tempFilter.language === SEARCH_QUERY_LANGUAGE.KUERY
                ? i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderKql', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method : "GET" or status : "404"' },
                  })
                : i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderLucene', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method:GET OR status:404' },
                  })
            }
            dataTestSubj="transformQueryInput"
            languageSwitcherPopoverAnchorPosition="rightDown"
          />
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <EuiFieldText
            inputRef={labelRef}
            value={tempFilter.label || ''}
            onChange={(e) => onLabelChange(e.target.value.trim())}
            onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
              if (keys.ENTER === key) {
                if (tempFilter.input.query.length) {
                  setFilter(tempFilter);
                  setIsPopoverOpen(false);
                  setTempFilter(emptyFilter);
                }
              }
              if (keys.ESCAPE === key) {
                setIsPopoverOpen(false);
              }
            }}
            fullWidth
            placeholder={tempFilter.input.query.length ? tempFilter.input.query : 'All requests'}
            prepend="Label*"
            aria-label="Label for your filter"
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};

export const EditFilterPopover = ({ filter, setFilter, indexPattern, Button }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState(filter);
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  const labelRef = useRef<HTMLInputElement>();
  const onQueryChange = (input: Query) => setTempFilter({ ...tempFilter, input });
  const onLabelChange = (label: string) => setTempFilter({ ...tempFilter, label });
  const onSubmit = (input: Query) => {
    let filterQuery;
    // try {
    if (input.language === SEARCH_QUERY_LANGUAGE.KUERY) {
      filterQuery = esKuery.toElasticsearchQuery(
        esKuery.fromKueryExpression(input.query),
        indexPattern
      );
    } else if (input.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
      filterQuery = esQuery.luceneStringToDsl(input.query);
    } else {
      filterQuery = {};
    }
    if (input.query.length) {
      if (tempFilter.label) {
        setFilter(tempFilter);
        setIsPopoverOpen(false);
      } else {
        if (labelRef?.current?.focus) {
          labelRef.current.focus();
        }
      }
    }
  };

  return (
    <EuiPopover
      anchorClassName="lnsLayerPanel__anchor"
      panelClassName="lnsIndexPatternDimensionEditor__filtersEditor"
      ownFocus
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        setTempFilter(filter);
      }}
      button={<Button onClick={() => setIsPopoverOpen((open) => !open)} />}
    >
      <EuiForm>
        <EuiFormRow fullWidth>
          <QueryStringInput
            bubbleSubmitEvent={true}
            indexPatterns={[indexPattern]}
            query={tempFilter.input}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            placeholder={
              tempFilter.language === SEARCH_QUERY_LANGUAGE.KUERY
                ? i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderKql', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method : "GET" or status : "404"' },
                  })
                : i18n.translate('xpack.transform.stepDefineForm.queryPlaceholderLucene', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method:GET OR status:404' },
                  })
            }
            dataTestSubj="transformQueryInput"
            languageSwitcherPopoverAnchorPosition="rightDown"
          />
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <EuiFieldText
            inputRef={labelRef}
            value={tempFilter.label || ''}
            onChange={(e) => onLabelChange(e.target.value.trim())}
            onKeyDown={({ key }: React.KeyboardEvent<HTMLInputElement>) => {
              if (keys.ENTER === key) {
                if (tempFilter.input.query.length) {
                  setFilter(tempFilter);
                  setIsPopoverOpen(false);
                  setTempFilter(emptyFilter);
                }
              }
              if (keys.ESCAPE === key) {
                setIsPopoverOpen(false);
              }
            }}
            fullWidth
            placeholder={tempFilter.input.query.length ? tempFilter.input.query : 'All requests'}
            prepend="Label*"
            aria-label="Label for your filter"
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};

export const EmptyFilterPopover = ({ indexPattern, setFilter }) => {
  const [filter, setLocalFilter] = useState(emptyFilter);
  const button = ({ onClick }: { onClick: MouseEventHandler }) => (
    <EuiButtonEmpty iconType="plusInCircle" onClick={onClick}>
      {i18n.translate('xpack.lens.indexPattern.filters.addSearchQuery', {
        defaultMessage: 'Add a search query',
      })}
    </EuiButtonEmpty>
  );
  return (
    <FilterPopover
      indexPattern={indexPattern}
      filter={filter}
      Button={button}
      setFilter={(f) => {
        setFilter(f);
        setLocalFilter(emptyFilter);
      }}
    />
  );
};
