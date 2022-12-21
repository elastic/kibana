/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiPortal,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFieldSearch,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../../shared/flash_messages';

import { SearchLogic } from '../../../search';
import {
  RESULT_ACTIONS_DIRECTIONS,
  PROMOTE_DOCUMENT_ACTION,
  DEMOTE_DOCUMENT_ACTION,
  HIDE_DOCUMENT_ACTION,
  SHOW_DOCUMENT_ACTION,
} from '../../constants';
import { CurationLogic } from '../curation_logic';

import { AddResultLogic, CurationResult } from '.';

export const AddResultFlyout: React.FC = () => {
  const searchLogic = SearchLogic({ id: 'add-results-flyout' });
  const { searchQuery, searchResults, searchDataLoading } = useValues(searchLogic);
  const { closeFlyout } = useActions(AddResultLogic);
  const { search } = useActions(searchLogic);

  const { promotedIds, hiddenIds } = useValues(CurationLogic);
  const { addPromotedId, removePromotedId, addHiddenId, removeHiddenId } =
    useActions(CurationLogic);

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={closeFlyout} aria-labelledby="addResultFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="addResultFlyout">
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.addResult.title', {
                defaultMessage: 'Add result to curation',
              })}
            </h2>
          </EuiTitle>
          <EuiText color="subdued">
            <p>{RESULT_ACTIONS_DIRECTIONS}</p>
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody banner={<FlashMessages />}>
          <EuiFieldSearch
            value={searchQuery}
            onChange={(e) => search(e.target.value)}
            isLoading={searchDataLoading}
            placeholder={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.curations.addResult.searchPlaceholder',
              { defaultMessage: 'Search engine documents' }
            )}
            fullWidth
            autoFocus
          />
          <EuiSpacer />

          {searchResults.length > 0 ? (
            <EuiFlexGroup direction="column" gutterSize="s">
              {searchResults.map((result, index) => {
                const id = result.id.raw;
                const isPromoted = promotedIds.includes(id);
                const isHidden = hiddenIds.includes(id);

                return (
                  <EuiFlexItem key={index}>
                    <CurationResult
                      result={result}
                      actions={[
                        isHidden
                          ? {
                              ...SHOW_DOCUMENT_ACTION,
                              onClick: () => removeHiddenId(id),
                            }
                          : {
                              ...HIDE_DOCUMENT_ACTION,
                              onClick: () => addHiddenId(id),
                            },
                        isPromoted
                          ? {
                              ...DEMOTE_DOCUMENT_ACTION,
                              onClick: () => removePromotedId(id),
                            }
                          : {
                              ...PROMOTE_DOCUMENT_ACTION,
                              onClick: () => addPromotedId(id),
                            },
                      ]}
                    />
                  </EuiFlexItem>
                );
              })}
            </EuiFlexGroup>
          ) : (
            <EuiEmptyPrompt
              body={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.curations.addResult.searchEmptyDescription',
                { defaultMessage: 'No matching content found.' }
              )}
            />
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
