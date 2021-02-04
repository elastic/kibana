/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import './result.scss';

import { EuiPanel, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FieldValue, Result as ResultType } from './types';
import { ResultField } from './result_field';
import { ResultHeader } from './result_header';

interface Props {
  result: ResultType;
  showScore?: boolean;
}

const RESULT_CUTOFF = 5;

export const Result: React.FC<Props> = ({ result, showScore }) => {
  const [isOpen, setIsOpen] = useState(false);

  const ID = 'id';
  const META = '_meta';
  const resultMeta = result[META];
  const resultFields = useMemo(
    () => Object.entries(result).filter(([key]) => key !== META && key !== ID),
    [result]
  );
  const numResults = resultFields.length;

  return (
    <EuiPanel
      paddingSize="none"
      className="appSearchResult"
      data-test-subj="AppSearchResult"
      title={i18n.translate('xpack.enterpriseSearch.appSearch.result.title', {
        defaultMessage: 'View document details',
      })}
    >
      <article className="appSearchResult__content">
        <ResultHeader resultMeta={resultMeta} showScore={!!showScore} />
        <div className="appSearchResult__body">
          {resultFields
            .slice(0, isOpen ? resultFields.length : RESULT_CUTOFF)
            .map(([field, value]: [string, FieldValue]) => (
              <ResultField key={field} field={field} raw={value.raw} snippet={value.snippet} />
            ))}
        </div>
        {numResults > RESULT_CUTOFF && !isOpen && (
          <footer className="appSearchResult__hiddenFieldsIndicator">
            {i18n.translate('xpack.enterpriseSearch.appSearch.result.numberOfAdditionalFields', {
              defaultMessage: '{numberOfAdditionalFields} more fields',
              values: {
                numberOfAdditionalFields: numResults - RESULT_CUTOFF,
              },
            })}
          </footer>
        )}
      </article>
      {numResults > RESULT_CUTOFF && (
        <button
          type="button"
          className="appSearchResult__actionButton"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={
            isOpen
              ? i18n.translate('xpack.enterpriseSearch.appSearch.result.hideAdditionalFields', {
                  defaultMessage: 'Hide additional fields',
                })
              : i18n.translate('xpack.enterpriseSearch.appSearch.result.showAdditionalFields', {
                  defaultMessage: 'Show additional fields',
                })
          }
        >
          {isOpen ? (
            <EuiIcon data-test-subj="CollapseResult" type="arrowUp" />
          ) : (
            <EuiIcon data-test-subj="ExpandResult" type="arrowDown" />
          )}
        </button>
      )}
    </EuiPanel>
  );
};
