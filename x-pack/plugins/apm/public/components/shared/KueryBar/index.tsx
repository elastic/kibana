/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { uniqueId, startsWith } from 'lodash';
import { EuiCallOut } from '@elastic/eui';
import chrome from 'ui/chrome';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import { StaticIndexPattern } from 'ui/index_patterns';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { KibanaLink } from '../Links/KibanaLink';
// @ts-ignore
import { Typeahead } from './Typeahead';
import {
  convertKueryToEsQuery,
  getSuggestions,
  getAPMIndexPatternForKuery
} from '../../../services/kuery';
// @ts-ignore
import { getBoolFilter } from './get_bool_filter';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { history } from '../../../utils/history';

const Container = styled.div`
  margin-bottom: 10px;
`;

interface State {
  indexPattern: StaticIndexPattern | null;
  suggestions: AutocompleteSuggestion[];
  isLoadingIndexPattern: boolean;
  isLoadingSuggestions: boolean;
}

export function KueryBar() {
  const [state, setState] = useState<State>({
    indexPattern: null,
    suggestions: [],
    isLoadingIndexPattern: true,
    isLoadingSuggestions: false
  });
  const { urlParams } = useUrlParams();
  const location = useLocation();
  const apmIndexPatternTitle = chrome.getInjected('apmIndexPatternTitle');
  const indexPatternMissing =
    !state.isLoadingIndexPattern && !state.indexPattern;
  let currentRequestCheck;

  useEffect(() => {
    let didCancel = false;

    async function loadIndexPattern() {
      setState({ ...state, isLoadingIndexPattern: true });
      const indexPattern = await getAPMIndexPatternForKuery();
      if (didCancel) {
        return;
      }
      if (!indexPattern) {
        setState({ ...state, isLoadingIndexPattern: false });
      } else {
        setState({ ...state, indexPattern, isLoadingIndexPattern: false });
      }
    }
    loadIndexPattern();

    return () => {
      didCancel = true;
    };
  }, []);

  async function onChange(inputValue: string, selectionStart: number) {
    const { indexPattern } = state;

    if (indexPattern === null) {
      return;
    }

    setState({ ...state, suggestions: [], isLoadingSuggestions: true });

    const currentRequest = uniqueId();
    currentRequestCheck = currentRequest;

    const boolFilter = getBoolFilter(urlParams);
    try {
      const suggestions = (await getSuggestions(
        inputValue,
        selectionStart,
        indexPattern,
        boolFilter
      ))
        .filter(suggestion => !startsWith(suggestion.text, 'span.'))
        .slice(0, 15);

      if (currentRequest !== currentRequestCheck) {
        return;
      }

      setState({ ...state, suggestions, isLoadingSuggestions: false });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error while fetching suggestions', e);
    }
  }

  function onSubmit(inputValue: string) {
    const { indexPattern } = state;

    if (indexPattern === null) {
      return;
    }

    try {
      const res = convertKueryToEsQuery(inputValue, indexPattern);
      if (!res) {
        return;
      }

      history.replace({
        ...location,
        search: fromQuery({
          ...toQuery(location.search),
          kuery: encodeURIComponent(inputValue.trim())
        })
      });
    } catch (e) {
      console.log('Invalid kuery syntax'); // eslint-disable-line no-console
    }
  }

  return (
    <Container>
      <Typeahead
        disabled={indexPatternMissing}
        isLoading={state.isLoadingSuggestions}
        initialValue={urlParams.kuery}
        onChange={onChange}
        onSubmit={onSubmit}
        suggestions={state.suggestions}
      />

      {indexPatternMissing && (
        <EuiCallOut
          style={{ display: 'inline-block', marginTop: '10px' }}
          title={
            <div>
              <FormattedMessage
                id="xpack.apm.kueryBar.indexPatternMissingWarningMessage"
                defaultMessage="There's no APM index pattern with the title {apmIndexPatternTitle} available. To use the Query bar, please choose to import the APM index pattern via the {setupInstructionsLink}."
                values={{
                  apmIndexPatternTitle: `"${apmIndexPatternTitle}"`,
                  setupInstructionsLink: (
                    <KibanaLink path={`/home/tutorial/apm`}>
                      {i18n.translate(
                        'xpack.apm.kueryBar.setupInstructionsLinkLabel',
                        { defaultMessage: 'Setup Instructions' }
                      )}
                    </KibanaLink>
                  )
                }}
              />
            </div>
          }
          color="warning"
          iconType="alert"
          size="s"
        />
      )}
    </Container>
  );
}
