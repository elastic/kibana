/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type { Query } from '@kbn/es-query';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useDebouncedValue } from '../debounced_value';
import { LensAppServices } from '../../app_plugin/types';

export const QueryInput = ({
  value,
  onChange,
  indexPattern,
  isInvalid,
  onSubmit,
  disableAutoFocus,
  ['data-test-subj']: dataTestSubj,
  placeholder,
}: {
  value: Query;
  onChange: (input: Query) => void;
  indexPattern: string | { type: 'title' | 'id'; value: string };
  isInvalid: boolean;
  onSubmit: () => void;
  disableAutoFocus?: boolean;
  'data-test-subj'?: string;
  placeholder?: string;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange });
  const lensAppServices = useKibana<LensAppServices>().services;

  const { data, uiSettings, http, notifications, docLinks, storage, unifiedSearch, dataViews } =
    lensAppServices;

  return (
    <QueryStringInput
      dataTestSubj={dataTestSubj ?? 'indexPattern-filters-queryStringInput'}
      size="s"
      disableAutoFocus={disableAutoFocus}
      isInvalid={isInvalid}
      bubbleSubmitEvent={false}
      indexPatterns={[indexPattern]}
      query={inputValue}
      onChange={(newQuery) => {
        if (!isEqual(newQuery, inputValue)) {
          handleInputChange(newQuery);
        }
      }}
      onSubmit={() => {
        if (inputValue.query) {
          onSubmit();
        }
      }}
      placeholder={
        placeholder ??
        (inputValue.language === 'kuery'
          ? i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderKql', {
              defaultMessage: '{example}',
              values: { example: 'method : "GET" or status : "404"' },
            })
          : i18n.translate('xpack.lens.indexPattern.filters.queryPlaceholderLucene', {
              defaultMessage: '{example}',
              values: { example: 'method:GET OR status:404' },
            }))
      }
      languageSwitcherPopoverAnchorPosition="rightDown"
      appName={i18n.translate('xpack.lens.queryInput.appName', {
        defaultMessage: 'Lens',
      })}
      deps={{ unifiedSearch, notifications, http, docLinks, uiSettings, data, storage, dataViews }}
    />
  );
};
