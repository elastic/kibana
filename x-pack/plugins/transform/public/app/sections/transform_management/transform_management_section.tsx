/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
  EuiModal,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
  EuiCallOut,
  EuiButton,
} from '@elastic/eui';
import {
  APP_GET_TRANSFORM_CLUSTER_PRIVILEGES,
  TRANSFORM_STATE,
} from '../../../../common/constants';

import { useRefreshTransformList, TransformListRow } from '../../common';
import { useDocumentationLinks } from '../../hooks/use_documentation_links';
import { useDeleteTransforms, useGetTransforms } from '../../hooks';
import { RedirectToCreateTransform } from '../../common/navigation';
import { PrivilegesWrapper } from '../../lib/authorization';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';

import { useRefreshInterval } from './components/transform_list/use_refresh_interval';
import { SearchSelection } from './components/search_selection';
import { TransformList } from './components/transform_list';
import { TransformStatsBar } from './components/transform_list/transforms_stats_bar';
import {
  AlertRulesManageContext,
  getAlertRuleManageContext,
  TransformAlertFlyoutWrapper,
} from '../../../alerting/transform_alerting_flyout';

export const TransformManagement: FC = () => {
  const { esTransform } = useDocumentationLinks();

  const [transformsLoading, setTransformsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [transforms, setTransforms] = useState<TransformListRow[]>([]);
  const [transformNodes, setTransformNodes] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [transformIdsWithoutConfig, setTransformIdsWithoutConfig] = useState<
    string[] | undefined
  >();

  const deleteTransforms = useDeleteTransforms();

  const getTransforms = useGetTransforms(
    setTransforms,
    setTransformNodes,
    setErrorMessage,
    setTransformIdsWithoutConfig,
    setIsInitialized,
    blockRefresh
  );

  // Subscribe to the refresh observable to trigger reloading the transform list.
  useRefreshTransformList({
    isLoading: setTransformsLoading,
    onRefresh: () => getTransforms(true),
  });
  // Call useRefreshInterval() after the subscription above is set up.
  useRefreshInterval(setBlockRefresh);

  const [isSearchSelectionVisible, setIsSearchSelectionVisible] = useState(false);
  const [savedObjectId, setSavedObjectId] = useState<string | null>(null);

  if (savedObjectId !== null) {
    return <RedirectToCreateTransform savedObjectId={savedObjectId} />;
  }

  const onCloseModal = () => setIsSearchSelectionVisible(false);
  const onOpenModal = () => setIsSearchSelectionVisible(true);
  const onSearchSelected = (id: string, type: string) => {
    setSavedObjectId(id);
  };

  const docsLink = (
    <EuiButtonEmpty
      href={esTransform}
      target="_blank"
      iconType="help"
      data-test-subj="documentationLink"
    >
      <FormattedMessage
        id="xpack.transform.transformList.transformDocsLinkText"
        defaultMessage="Transform docs"
      />
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="transformAppTitle">
            <FormattedMessage
              id="xpack.transform.transformList.transformTitle"
              defaultMessage="Transforms"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.transform.transformList.transformDescription"
            defaultMessage="Use transforms to pivot existing Elasticsearch indices into summarized entity-centric indices or to create an indexed view of the latest documents for fast access."
          />
        }
        rightSideItems={[docsLink]}
        bottomBorder
      />

      <EuiSpacer size="l" />

      <EuiPageContentBody data-test-subj="transformPageTransformList">
        {!isInitialized && <EuiLoadingContent lines={2} />}
        {isInitialized && (
          <>
            <TransformStatsBar transformNodes={transformNodes} transformsList={transforms} />
            <EuiSpacer size="s" />
            {typeof errorMessage !== 'undefined' && (
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiSpacer size="l" />
                  <EuiPageContent
                    verticalPosition="center"
                    horizontalPosition="center"
                    color="danger"
                  >
                    <EuiEmptyPrompt
                      iconType="alert"
                      title={
                        <h2>
                          <FormattedMessage
                            id="xpack.transform.list.errorPromptTitle"
                            defaultMessage="An error occurred getting the transform list"
                          />
                        </h2>
                      }
                      body={
                        <p>
                          <pre>{JSON.stringify(errorMessage)}</pre>
                        </p>
                      }
                      actions={[]}
                    />
                  </EuiPageContent>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            {typeof errorMessage === 'undefined' && (
              <AlertRulesManageContext.Provider value={getAlertRuleManageContext()}>
                {transformIdsWithoutConfig ? (
                  <>
                    <EuiCallOut color="warning">
                      <p>
                        <FormattedMessage
                          id="xpack.transform.danglingTasksError"
                          defaultMessage="{count} {count, plural, one {transform is} other {transforms are}} missing configuration details: [{transformIds}] {count, plural, one {It} other {They}} cannot be recovered and should be deleted."
                          values={{
                            count: transformIdsWithoutConfig.length,
                            transformIds: transformIdsWithoutConfig.join(', '),
                          }}
                        />
                      </p>
                      <EuiButton
                        color="warning"
                        size="s"
                        onClick={async () => {
                          await deleteTransforms(
                            // If transform task doesn't have any corresponding config
                            // we won't know what the destination index or data view would be
                            // and should be force deleted
                            {
                              transformsInfo: transformIdsWithoutConfig.map((id) => ({
                                id,
                                state: TRANSFORM_STATE.FAILED,
                              })),
                              deleteDestIndex: false,
                              deleteDestDataView: false,
                              forceDelete: true,
                            }
                          );
                        }}
                      >
                        <FormattedMessage
                          id="xpack.transform.forceDeleteTransformMessage"
                          defaultMessage="Delete {count} {count, plural, one {transform} other {transforms}}"
                          values={{
                            count: transformIdsWithoutConfig.length,
                          }}
                        />
                      </EuiButton>
                    </EuiCallOut>
                    <EuiSpacer />
                  </>
                ) : null}
                <TransformList
                  onCreateTransform={onOpenModal}
                  transformNodes={transformNodes}
                  transforms={transforms}
                  transformsLoading={transformsLoading}
                />
                <TransformAlertFlyoutWrapper />
              </AlertRulesManageContext.Provider>
            )}
          </>
        )}
      </EuiPageContentBody>

      {isSearchSelectionVisible && (
        <EuiModal
          onClose={onCloseModal}
          className="transformCreateTransformSearchDialog"
          data-test-subj="transformSelectSourceModal"
        >
          <SearchSelection onSearchSelected={onSearchSelected} />
        </EuiModal>
      )}
    </>
  );
};

export const TransformManagementSection: FC = () => {
  // Set breadcrumb and page title
  useEffect(() => {
    breadcrumbService.setBreadcrumbs(BREADCRUMB_SECTION.HOME);
    docTitleService.setTitle('home');
  }, []);

  return (
    <PrivilegesWrapper privileges={APP_GET_TRANSFORM_CLUSTER_PRIVILEGES}>
      <TransformManagement />
    </PrivilegesWrapper>
  );
};
