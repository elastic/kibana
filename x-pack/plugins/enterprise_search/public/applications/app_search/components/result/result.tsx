/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';

import './result.scss';

import { EuiPanel, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FieldValue, Result as ResultType } from './types';
import { ResultField } from './result_field';
import { ResultHeader } from './result_header';
import { getDocumentDetailRoute } from '../../routes';
import { ReactRouterHelper } from '../../../shared/react_router_helpers/eui_components';
import { Schema } from '../../../shared/types';

interface Props {
  result: ResultType;
  showScore?: boolean;
  shouldLinkToDetailPage?: boolean;
  schemaForTypeHighlights?: Schema;
}

const RESULT_CUTOFF = 5;

export const Result: React.FC<Props> = ({
  result,
  showScore = false,
  shouldLinkToDetailPage = false,
  schemaForTypeHighlights,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const ID = 'id';
  const META = '_meta';
  const resultMeta = result[META];
  const resultFields = useMemo(
    () => Object.entries(result).filter(([key]) => key !== META && key !== ID),
    [result]
  );
  const numResults = resultFields.length;
  const typeForField = (fieldName: string) => {
    if (schemaForTypeHighlights) return schemaForTypeHighlights[fieldName];
  };

  const conditionallyLinkedArticle = (children: React.ReactNode) => {
    if (!shouldLinkToDetailPage)
      return <article className="appSearchResult__content">{children}</article>;
    return (
      <ReactRouterHelper to={getDocumentDetailRoute(resultMeta.engine, resultMeta.id)}>
        <a className="appSearchResult__content">{children}</a>
      </ReactRouterHelper>
    );
  };

  return (
    <EuiPanel
      paddingSize="none"
      className="appSearchResult"
      data-test-subj="AppSearchResult"
      title={i18n.translate('xpack.enterpriseSearch.appSearch.result.title', {
        defaultMessage: 'View document details',
      })}
    >
      {conditionallyLinkedArticle(
        <>
          <ResultHeader resultMeta={resultMeta} showScore={!!showScore} />
          <div className="appSearchResult__body">
            {resultFields
              .slice(0, isOpen ? resultFields.length : RESULT_CUTOFF)
              .map(([field, value]: [string, FieldValue]) => (
                <ResultField
                  key={field}
                  field={field}
                  raw={value.raw}
                  snippet={value.snippet}
                  type={typeForField(field)}
                />
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
        </>
      )}
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
