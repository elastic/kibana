/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CONTINUE_BUTTON_LABEL } from '../../../../../shared/constants';

import { Curation } from '../../types';

import { CurationQueriesLogic } from './curation_queries_logic';
import { CurationQuery } from './curation_query';
import { filterEmptyQueries } from './utils';
import './curation_queries.scss';

interface Props {
  queries: Curation['queries'];
  onSubmit(queries: Curation['queries']): void;
  submitButtonText?: string;
}

export const CurationQueries: React.FC<Props> = ({
  queries: initialQueries,
  onSubmit,
  submitButtonText = CONTINUE_BUTTON_LABEL,
}) => {
  const logic = CurationQueriesLogic({ queries: initialQueries });
  const { queries, hasEmptyQueries, hasOnlyOneQuery } = useValues(logic);
  const { addQuery, editQuery, deleteQuery } = useActions(logic);

  return (
    <>
      {queries.map((query: string, index) => (
        <CurationQuery
          key={`query-${index}`}
          queryValue={query}
          onChange={(newValue) => editQuery(index, newValue)}
          onDelete={() => deleteQuery(index)}
          disableDelete={hasOnlyOneQuery}
        />
      ))}
      <EuiButtonEmpty
        size="s"
        iconType="plusInCircle"
        onClick={addQuery}
        isDisabled={hasEmptyQueries}
        data-test-subj="addCurationQueryButton"
      >
        {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.addQueryButtonLabel', {
          defaultMessage: 'Add query',
        })}
      </EuiButtonEmpty>
      <EuiSpacer />
      <EuiButton
        fill
        isDisabled={hasOnlyOneQuery && hasEmptyQueries}
        onClick={() => onSubmit(filterEmptyQueries(queries))}
        data-test-subj="submitCurationQueriesButton"
      >
        {submitButtonText}
      </EuiButton>
    </>
  );
};
