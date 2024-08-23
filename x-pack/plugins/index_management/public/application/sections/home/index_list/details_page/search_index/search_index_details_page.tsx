/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageSection,
  EuiPopover,
  EuiSpacer,
  EuiButton,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router';
import { i18n } from '@kbn/i18n';
import { DetailsPageEmptyIndexNameError } from '../details_page_errors/error_empty_index_name';
import { DetailsPageLoading } from '../details_page_index_loading';
import { DetailsPageError } from '../details_page_errors/details_page_error';
import { useIndexDetailsFunctions } from '../../../../../hooks/use_index_details_page_index_functions';
import { FormattedMessage } from '@kbn/i18n-react';
import { DeleteIndexModal } from '../../index_delete_modal';
import { deleteIndices } from '../../../../../../application/services';
import { notificationService } from '../../../../../services/notification';

export const SearchIndexDetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string }>
> = ({ location: { search }, history }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const { isIndicesLoading, error, index, fetchIndexDetails, navigateToIndicesList } =
    useIndexDetailsFunctions(indexName, search, history);

  const [isShowingMoreOptionsPopover, setShowMoreOptionsPopover] = useState<boolean>(false);
  const [isShowingDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  const pageTitle = <>{index?.name}</>;
  const indexNames: string[] = useMemo(() => {
    return [indexName];
  }, [indexName]);

  const deleteIndex = useCallback(async () => {
    if (indexName && indexNames.length > 0) {
      setDeleteLoading(true);
      try {
        await deleteIndices(indexNames);
        setDeleteLoading(false);
        notificationService.showSuccessToast(
          i18n.translate('xpack.idxMgmt.searchIndexDetails.indexDeletedMessage', {
            defaultMessage: 'The index {indexName} was deleted.',
            values: { indexNames: indexName },
          })
        );
        navigateToIndicesList();
      } catch (error) {
        setDeleteLoading(false);
        notificationService.showDangerToast(error.body.message);
      }
    }
  }, [navigateToIndicesList, indexName]);

  if (!indexName) {
    return <DetailsPageEmptyIndexNameError />;
  }
  if ((isIndicesLoading || isDeleteLoading) && !index) {
    return <DetailsPageLoading />;
  }
  if (error || !index) {
    return (
      <DetailsPageError
        indexName={indexName}
        resendRequest={fetchIndexDetails}
        navigateToIndicesList={navigateToIndicesList}
      />
    );
  }

  return (
    <>
      <EuiPageSection paddingSize="none">
        <EuiButton
          data-test-subj="searchIndexDetailsBackToIndicesButton"
          color="text"
          iconType="arrowLeft"
          onClick={navigateToIndicesList}
        >
          <FormattedMessage
            id="xpack.idxMgmt.searchIndexDetails.backToIndicesButtonLabel"
            defaultMessage="Back to indices"
          />
        </EuiButton>
      </EuiPageSection>
      <EuiSpacer size="l" />
      <EuiPageHeader
        data-test-subj="indexDetailsHeader"
        pageTitle={pageTitle}
        rightSideItems={
          isIndicesLoading || isDeleteLoading
            ? []
            : [
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiPopover
                      isOpen={isShowingMoreOptionsPopover}
                      button={
                        <EuiButtonIcon
                          data-test-subj="searchindexDetailsMoreOptionsButton"
                          data-telemetry-id="idxMgmt-searchIndexDetails-moreOptionsButton"
                          color="primary"
                          size="m"
                          iconType="boxesVertical"
                          aria-label={i18n.translate(
                            'xpack.idxMgmt.searchIndexDetails.moreOptionsButton.ariaLabel',
                            {
                              defaultMessage: 'More options',
                            }
                          )}
                          onClick={() => setShowMoreOptionsPopover(!isShowingMoreOptionsPopover)}
                        />
                      }
                    >
                      <EuiContextMenuPanel
                        size="s"
                        items={[
                          <EuiContextMenuItem
                            icon={<EuiIcon type="trash" color="danger" />}
                            onClick={() => {
                              setShowDeleteModal(!isShowingDeleteModal);
                            }}
                          >
                            <EuiText size="s" color="danger">
                              {i18n.translate('xpack.idxMgmt.searchIndexDetails.deleteIndexLabel', {
                                defaultMessage: 'Delete Index',
                              })}
                            </EuiText>
                          </EuiContextMenuItem>,
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                </EuiFlexGroup>,
              ]
        }
      >
        <EuiText size="s">
          {i18n.translate('xpack.idxMgmt.searchIndexDetails.description', {
            defaultMessage:
              'This is your very first Elasticsearch index. It stores the data you’d like to search.',
          })}
        </EuiText>
      </EuiPageHeader>
      <EuiSpacer size="l" />
      {isShowingDeleteModal && (
        <DeleteIndexModal
          onCancel={() => setShowDeleteModal(!isShowingDeleteModal)}
          onConfirm={() => {
            deleteIndex();
          }}
          indexNames={indexNames}
        />
      )}
      <div data-test-subj={`searchIndexDetailsContent`}></div>
    </>
  );
};
