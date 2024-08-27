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
import React, { useEffect, useMemo, useState } from 'react';
import { FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DetailsPageEmptyIndexNameError } from '../details_page_errors/error_empty_index_name';
import { DetailsPageLoading } from '../details_page_index_loading';
import { DetailsPageError } from '../details_page_errors/details_page_error';
import { useIndexFunctions } from '../../../../../hooks/use_index_functions';
import { DeleteIndexModal } from '../../index_delete_modal';

export const SearchIndexDetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string }>
> = ({ location: { search }, history }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const {
    indexLoadingError,
    index,
    isIndicesLoading,
    isDeleteLoading,
    fetchIndexDetails,
    deleteIndex,
    navigateToIndicesList,
  } = useIndexFunctions(indexName, search, history);

  const [isShowingMoreOptionsPopover, setShowMoreOptionsPopover] = useState<boolean>(false);
  const [isShowingDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  const pageTitle = <>{index?.name}</>;

  if (!indexName) {
    return <DetailsPageEmptyIndexNameError />;
  }
  if ((isIndicesLoading || isDeleteLoading) && !index) {
    return <DetailsPageLoading />;
  }
  if (indexLoadingError || !index) {
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
        data-test-subj="searchIndexDetailsHeader"
        pageTitle={pageTitle}
        rightSideItems={
          isIndicesLoading || isDeleteLoading
            ? []
            : [
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiPopover
                      isOpen={isShowingMoreOptionsPopover}
                      closePopover={() => setShowMoreOptionsPopover(!isShowingMoreOptionsPopover)}
                      button={
                        <EuiButtonIcon
                          data-test-subj="searchIndexDetailsMoreOptionsButton"
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
                        data-test-subj="searchIndexMoreOptionsMenu"
                        items={[
                          <EuiContextMenuItem
                            key="searchIndexDeleteButton"
                            icon={<EuiIcon type="trash" color="danger" />}
                            data-test-subj="searchIndexDeleteButton"
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
      ></EuiPageHeader>
      <EuiSpacer size="l" />
      {isShowingDeleteModal && (
        <DeleteIndexModal
          onCancel={() => setShowDeleteModal(!isShowingDeleteModal)}
          onConfirm={() => {
            deleteIndex();
          }}
          indexNames={[indexName]}
        />
      )}
      <div data-test-subj="searchIndexDetailsContent" />
    </>
  );
};
