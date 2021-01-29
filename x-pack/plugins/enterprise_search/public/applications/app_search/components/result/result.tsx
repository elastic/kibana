/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';
import { generatePath } from 'react-router-dom';
import classNames from 'classnames';

import './result.scss';

import { EuiPanel, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ReactRouterHelper } from '../../../shared/react_router_helpers/eui_components';
import { ENGINE_DOCUMENT_DETAIL_PATH } from '../../routes';

import { Schema } from '../../../shared/types';
import { FieldValue, Result as ResultType } from './types';
import { ResultField } from './result_field';
import { ResultHeader } from './result_header';

interface Props {
  result: ResultType;
  isMetaEngine: boolean;
  showScore?: boolean;
  shouldLinkToDetailPage?: boolean;
  schemaForTypeHighlights?: Schema;
}

const RESULT_CUTOFF = 5;

export const Result: React.FC<Props> = ({
  result,
  isMetaEngine,
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

  const documentLink = generatePath(ENGINE_DOCUMENT_DETAIL_PATH, {
    engineName: resultMeta.engine,
    documentId: resultMeta.id,
  });
  const conditionallyLinkedArticle = (children: React.ReactNode) => {
    return shouldLinkToDetailPage ? (
      <ReactRouterHelper to={documentLink}>
        <article className="appSearchResult__content appSearchResult__content--link">
          {children}
        </article>
      </ReactRouterHelper>
    ) : (
      <article className="appSearchResult__content">{children}</article>
    );
  };

  const classes = classNames('appSearchResult', {
    'appSearchResult--link': shouldLinkToDetailPage,
  });

  return (
    <EuiPanel
      paddingSize="none"
      className={classes}
      data-test-subj="AppSearchResult"
      title={i18n.translate('xpack.enterpriseSearch.appSearch.result.title', {
        defaultMessage: 'Document {id}',
        values: { id: result[ID].raw },
      })}
    >
      {conditionallyLinkedArticle(
        <>
          <ResultHeader
            resultMeta={resultMeta}
            showScore={!!showScore}
            isMetaEngine={isMetaEngine}
          />
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
        </>
      )}
      {numResults > RESULT_CUTOFF && (
        <button
          type="button"
          className="appSearchResult__hiddenFieldsToggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen
            ? i18n.translate('xpack.enterpriseSearch.appSearch.result.hideAdditionalFields', {
                defaultMessage: 'Hide additional fields',
              })
            : i18n.translate('xpack.enterpriseSearch.appSearch.result.showAdditionalFields', {
                defaultMessage:
                  'Show {numberOfAdditionalFields, number} additional {numberOfAdditionalFields, plural, one {field} other {fields}}',
                values: {
                  numberOfAdditionalFields: numResults - RESULT_CUTOFF,
                },
              })}
          <EuiIcon
            type={isOpen ? 'arrowUp' : 'arrowDown'}
            data-test-subj={isOpen ? 'CollapseResult' : 'ExpandResult'}
          />
        </button>
      )}
      <div className="appSearchResult__actionButtons">
        {shouldLinkToDetailPage && (
          <ReactRouterHelper to={documentLink}>
            <a
              className="appSearchResult__actionButton appSearchResult__actionButton--link"
              aria-label={i18n.translate(
                'xpack.enterpriseSearch.appSearch.result.documentDetailLink',
                { defaultMessage: 'Visit document details' }
              )}
            >
              <EuiIcon type="popout" />
            </a>
          </ReactRouterHelper>
        )}
      </div>
    </EuiPanel>
  );
};
