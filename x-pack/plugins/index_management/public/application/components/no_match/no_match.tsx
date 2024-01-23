/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExtensionsService } from '../../../services';
import { CreateIndexButton } from '../../sections/home/index_list/create_index/create_index_button';

export const NoMatch = ({
  loadIndices,
  filter,
  resetFilter,
  extensionsService,
}: {
  loadIndices: () => void;
  filter: string;
  resetFilter: () => void;
  extensionsService: ExtensionsService;
}) => {
  if (filter) {
    return (
      <EuiEmptyPrompt
        data-test-subj="noIndicesMessage"
        title={
          <h3>
            <FormattedMessage
              id="xpack.idxMgmt.noMatch.noIndicesTitle"
              defaultMessage="No indices found"
            />
          </h3>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.noMatch.noIndicesDescription"
              defaultMessage="Start a new search or try using different filters."
            />
          </p>
        }
        actions={
          <EuiButton
            onClick={resetFilter}
            fill
            color="primary"
            iconType="cross"
            data-test-subj="clearIndicesSearch"
          >
            <FormattedMessage
              id="xpack.idxMgmt.noMatch.clearSearchButton"
              defaultMessage="Clear search"
            />
          </EuiButton>
        }
      />
    );
  }

  if (extensionsService.emptyListContent) {
    return extensionsService.emptyListContent.renderContent({
      createIndexButton: <CreateIndexButton loadIndices={loadIndices} />,
    });
  }

  return (
    <EuiEmptyPrompt
      data-test-subj="createIndexMessage"
      title={
        <h3>
          <FormattedMessage
            id="xpack.idxMgmt.noMatch.createIndexTitle"
            defaultMessage="No indices"
          />
        </h3>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.noMatch.createIndexDescription"
            defaultMessage="You don't have any indices yet."
          />
        </p>
      }
      actions={<CreateIndexButton loadIndices={loadIndices} />}
    />
  );
};
