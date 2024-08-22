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
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router';
import { i18n } from '@kbn/i18n';
import { DetailsPageEmptyIndexNameError } from '../details_page_errors/error_empty_index_name';
import { DetailsPageLoading } from '../details_page_index_loading';
import { DetailsPageError } from '../details_page_errors/details_page_error';
import { useIndexDetailsFunctions } from '../../../../../hooks/use_index_details_page_index_functions';
import { FormattedMessage } from '@kbn/i18n-react';

export const SearchIndexDetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string }>
> = ({ location: { search }, history }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const { isLoading, error, index, fetchIndexDetails, navigateToIndicesList } =
    useIndexDetailsFunctions(indexName, search, history);

  const [showMoreOptionsPopover, setShowMoreOptionsPopover] = useState<boolean>(false);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  const pageTitle = <>{index?.name}</>;
  if (!indexName) {
    return <DetailsPageEmptyIndexNameError />;
  }
  if (isLoading && !index) {
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
          isLoading
            ? []
            : [
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiPopover
                      isOpen={showMoreOptionsPopover}
                      button={
                        <EuiButtonIcon
                          data-test-subj="searchindexDetailsMoreOptionsButton"
                          data-telemetry-id="idxMgmt-searchIndexDetails-moreOptionsButton"
                          color="primary"
                          size="m"
                          iconType="boxesVertical"
                          aria-label={i18n.translate(
                            'xpack.idxMgmt.searchIndexDetails.more.ariaLabel',
                            {
                              defaultMessage: 'More options',
                            }
                          )}
                          onClick={() => setShowMoreOptionsPopover(!showMoreOptionsPopover)}
                        />
                      }
                    >
                      <EuiContextMenuPanel
                        size="s"
                        items={[
                          <EuiContextMenuItem key="edit" icon="trash" onClick={() => {}}>
                            {i18n.translate('xpack.idxMgmt.searchIndexDetails.deleteIndexLabel', {
                              defaultMessage: 'Delete Index',
                            })}
                          </EuiContextMenuItem>,
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                </EuiFlexGroup>,
              ]
        }
      >
        This is your very first Elasticsearch index. It stores the data you’d like to search.
      </EuiPageHeader>
      <EuiSpacer size="l" />
      <div data-test-subj={`searchIndexDetailsContent`}></div>
    </>
  );
};
