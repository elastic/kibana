/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import './result.scss';

import { EuiPanel, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Result as ResultType } from './types';
import { ResultField } from './result_field';

interface Props {
  result: ResultType;
}

const RESULT_CUTOFF = 5;

export const Result: React.FC<Props> = ({ result }) => {
  const [isOpen, setIsOpen] = useState(false);

  const ID = 'id';
  const META = '_meta';
  const resultFields = Object.entries(result).filter(([key]) => key !== META && key !== ID);
  const numResults = resultFields.length;

  return (
    <EuiPanel
      paddingSize="none"
      key="results"
      className={'appSearchResultContainer'}
      data-test-subj="AppSearchResult"
    >
      <div
        className="appSearchResult"
        title={i18n.translate('xpack.enterpriseSearch.appSearch.result.title', {
          defaultMessage: 'View document details',
        })}
      >
        <div className="appSearchResult__contentWrap">
          <div className="appSearchResult__contentInner">
            <div className="appSearchResult__fieldsetContainer">
              <div>
                {resultFields
                  .slice(0, isOpen ? resultFields.length : RESULT_CUTOFF)
                  .map(([field, value]) => (
                    <ResultField
                      key={field}
                      field={field}
                      raw={value.raw}
                      snippet={value.snippet}
                    />
                  ))}
              </div>
            </div>
          </div>
          {numResults > RESULT_CUTOFF && !isOpen && (
            <div className="appSearchResult__hiddenFieldsIndicator">
              {i18n.translate('xpack.enterpriseSearch.appSearch.result.numberOfAdditionalFields', {
                defaultMessage: '{numberOfAdditionalFields} more fields',
                values: {
                  numberOfAdditionalFields: numResults - RESULT_CUTOFF,
                },
              })}
            </div>
          )}
        </div>
        {numResults > RESULT_CUTOFF && (
          <button
            className="appSearchResult__toggleExpandButton"
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
              <EuiIcon
                data-test-subj="CollapseResult"
                type="arrowUp"
                className="appSearchResult__toggleIcon"
              />
            ) : (
              <EuiIcon
                data-test-subj="ExpandResult"
                type="arrowDown"
                className="appSearchResult__toggleIcon"
              />
            )}
          </button>
        )}
      </div>
    </EuiPanel>
  );
};
