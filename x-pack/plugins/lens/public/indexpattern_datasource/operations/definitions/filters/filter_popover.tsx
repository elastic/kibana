/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { MouseEventHandler, useState, useRef } from 'react';
import { EuiPopover, EuiFieldText, EuiForm, EuiFormRow, keys } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Filter, emptyFilter, SEARCH_QUERY_LANGUAGE } from '.';
import { IndexPattern } from '../../../types';

import {
  QueryStringInput,
  Query,
  esKuery,
  esQuery,
} from '../../../../../../../../src/plugins/data/public';

const defaultPlaceholderMessage = i18n.translate(
  'xpack.lens.indexPattern.filters.label.placeholder',
  {
    defaultMessage: 'All requests',
  }
);

export const FilterPopover = ({
  filter,
  setFilter,
  indexPattern,
  Button,
}: {
  filter: Filter;
  setFilter: Function;
  indexPattern: IndexPattern;
  Button: React.FunctionComponent<{ onClick: MouseEventHandler }>;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState(filter);

  const inputRef = useRef<HTMLInputElement>();
  const onQueryChange = (input: Query) => setTempFilter({ ...tempFilter, input });
  const onLabelChange = (label: string) => setTempFilter({ ...tempFilter, label: label.trim() });
  const onSubmit = (input: Query) => {
    try {
      if (input.language === SEARCH_QUERY_LANGUAGE.KUERY) {
        esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(input.query), indexPattern);
      } else if (input.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
        esQuery.luceneStringToDsl(input.query);
      }
      if (input.query.length) {
        if (tempFilter.label) {
          setFilter(tempFilter);
          setIsPopoverOpen(false);
        } else {
          if (inputRef.current) inputRef.current.focus();
        }
      }
    } catch (e) {
      console.log('Invalid syntax', JSON.stringify(e, null, 2)); // eslint-disable-line no-console
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
            bubbleSubmitEvent={false}
            indexPatterns={[indexPattern]}
            query={tempFilter.input}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            placeholder={
              tempFilter.input.language === SEARCH_QUERY_LANGUAGE.KUERY
                ? i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderKql', {
                    defaultMessage: 'e.g. {example}',
                    values: { example: 'method : "GET" or status : "404"' },
                  })
                : i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderLucene', {
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
            data-test-subj="indexPattern-filters-label"
            inputRef={(node) => {
              if (node) {
                inputRef.current = node;
              }
            }}
            value={tempFilter.label || ''}
            onChange={(e) => onLabelChange(e.target.value)}
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
            placeholder={
              tempFilter.input.query.length
                ? (tempFilter.input.query as string)
                : defaultPlaceholderMessage
            }
            prepend={i18n.translate('xpack.lens.indexPattern.filters.label', {
              defaultMessage: 'Label',
            })}
            aria-label={i18n.translate('xpack.lens.indexPattern.filters.label.aria-message', {
              defaultMessage: 'Label for your filter',
            })}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPopover>
  );
};
