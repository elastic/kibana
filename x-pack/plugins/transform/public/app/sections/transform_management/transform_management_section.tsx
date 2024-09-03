/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiPageTemplate,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  usePageUrlState,
  UrlStateProvider,
  type ListingPageUrlState,
  type PageUrlState,
} from '@kbn/ml-url-state';

import { useAppDependencies } from '../../app_dependencies';
import type { TransformListRow } from '../../common';
import { isTransformStats } from '../../../../common/types/transform_stats';
import { useGetTransformsStats } from '../../hooks/use_get_transform_stats';
import { useEnabledFeatures } from '../../serverless_context';
import { needsReauthorization } from '../../common/reauthorization_utils';
import { TRANSFORM_STATE } from '../../../../common/constants';
import { TRANSFORM_LIST_COLUMN } from '../../common';

import {
  useDocumentationLinks,
  useDeleteTransforms,
  useTransformCapabilities,
  useGetTransforms,
  useGetTransformNodes,
} from '../../hooks';
import { RedirectToCreateTransform } from '../../common/navigation';
import { CapabilitiesWrapper } from '../../components/capabilities_wrapper';
import { ToastNotificationText } from '../../components/toast_notification_text';
import { breadcrumbService, docTitleService, BREADCRUMB_SECTION } from '../../services/navigation';

import { SearchSelection } from './components/search_selection';
import { TransformList } from './components/transform_list';
import { TransformStatsBar } from './components/transform_list/transforms_stats_bar';
import {
  AlertRulesManageContext,
  getAlertRuleManageContext,
  TransformAlertFlyoutWrapper,
} from '../../../alerting/transform_alerting_flyout';

const getDefaultTransformListState = (): ListingPageUrlState => ({
  pageIndex: 0,
  pageSize: 10,
  sortField: TRANSFORM_LIST_COLUMN.ID,
  sortDirection: 'asc',
  showPerPageOptions: true,
});

const ErrorMessageCallout: FC<{
  text: JSX.Element;
  errorMessage: IHttpFetchError<unknown> | null;
}> = ({ text, errorMessage }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        title={
          <>
            {text}{' '}
            {errorMessage !== null && (
              <ToastNotificationText inline={true} forceModal={true} text={errorMessage} />
            )}
          </>
        }
        color="danger"
        iconType="error"
      />
    </>
  );
};

export const TransformManagement: FC = () => {
  const { esTransform } = useDocumentationLinks();
  const { showNodeInfo } = useEnabledFeatures();
  const { dataViewEditor } = useAppDependencies();
  const [transformPageState, setTransformPageState] = usePageUrlState<PageUrlState>(
    'transform',
    getDefaultTransformListState()
  );

  const deleteTransforms = useDeleteTransforms();

  const {
    isInitialLoading: transformNodesInitialLoading,
    error: transformNodesErrorMessage,
    data: transformNodesData = 0,
  } = useGetTransformNodes({ enabled: true });
  const transformNodes = transformNodesErrorMessage === null ? transformNodesData : 0;

  const {
    isInitialLoading: transformsInitialLoading,
    isLoading: transformsWithoutStatsLoading,
    error: transformsErrorMessage,
    data: { transforms: transformsWithoutStats, transformIdsWithoutConfig },
  } = useGetTransforms({
    enabled: !transformNodesInitialLoading && transformNodes > 0,
  });

  const {
    isLoading: transformsStatsLoading,
    error: transformsStatsErrorMessage,
    data: transformsStats,
  } = useGetTransformsStats({
    basic: true,
    enabled: !transformNodesInitialLoading && transformNodes > 0,
  });

  const transforms: TransformListRow[] = useMemo(() => {
    if (!transformsStats) return transformsWithoutStats;

    return transformsWithoutStats.map((t) => {
      const stats = transformsStats.transforms.find((d) => t.config.id === d.id);

      // A newly created transform might not have corresponding stats yet.
      // If that's the case we just skip the transform and don't add it to the transform list yet.
      if (!isTransformStats(stats)) {
        return t;
      }

      return { ...t, stats };
    });
  }, [transformsStats, transformsWithoutStats]);

  const isInitialLoading = transformNodesInitialLoading || transformsInitialLoading;

  const { canStartStopTransform } = useTransformCapabilities();

  const unauthorizedTransformsWarning = useMemo(() => {
    const unauthorizedCnt = transforms.filter((t) => needsReauthorization(t)).length;

    if (!unauthorizedCnt) return null;

    const insufficientPermissionsMsg = i18n.translate(
      'xpack.transform.transformList.unauthorizedTransformsCallout.insufficientPermissionsMsg',
      {
        defaultMessage:
          '{unauthorizedCnt, plural, one {A transform was created with insufficient permissions.} other {# transforms were created with insufficient permissions.}}',
        values: { unauthorizedCnt },
      }
    );
    const actionMsg = canStartStopTransform
      ? i18n.translate(
          'xpack.transform.transformList.unauthorizedTransformsCallout.reauthorizeMsg',
          {
            defaultMessage:
              'Reauthorize to start {unauthorizedCnt, plural, one {transform} other {# transforms}}.',
            values: { unauthorizedCnt },
          }
        )
      : i18n.translate(
          'xpack.transform.transformList.unauthorizedTransformsCallout.contactAdminMsg',
          {
            defaultMessage: 'Contact your administrator to request the required permissions.',
          }
        );
    return (
      <>
        <EuiCallOut
          iconType="alert"
          color="warning"
          data-test-subj="transformPageReauthorizeCallout"
          title={`${insufficientPermissionsMsg} ${actionMsg}`}
        />
        <EuiSpacer size="s" />
      </>
    );
  }, [transforms, canStartStopTransform]);

  const [isSearchSelectionVisible, setIsSearchSelectionVisible] = useState(false);
  const [savedObjectId, setSavedObjectId] = useState<string | null>(null);

  const onCloseModal = useCallback(() => setIsSearchSelectionVisible(false), []);
  const onOpenModal = () => setIsSearchSelectionVisible(true);

  const onSearchSelected = useCallback((id: string, type: string) => {
    setSavedObjectId(id);
  }, []);

  const canEditDataView = Boolean(dataViewEditor?.userPermissions.editDataView());

  const closeDataViewEditorRef = useRef<() => void | undefined>();

  const createNewDataView = useCallback(() => {
    onCloseModal();
    closeDataViewEditorRef.current = dataViewEditor?.openEditor({
      onSave: async (dataView) => {
        if (dataView.id) {
          onSearchSelected(dataView.id, 'index-pattern');
        }
      },

      allowAdHocDataView: true,
    });
  }, [dataViewEditor, onCloseModal, onSearchSelected]);

  useEffect(function cleanUpDataViewEditorFlyout() {
    return () => {
      // Close the editor when unmounting
      if (closeDataViewEditorRef.current) {
        closeDataViewEditorRef.current();
      }
    };
  }, []);

  if (savedObjectId !== null) {
    return <RedirectToCreateTransform savedObjectId={savedObjectId} />;
  }

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
      <EuiPageTemplate.Header
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
        paddingSize={'none'}
      />

      <EuiPageTemplate.Section paddingSize={'none'} data-test-subj="transformPageTransformList">
        {isInitialLoading && (
          <>
            <EuiSpacer size="s" />
            <EuiSkeletonText lines={2} />
          </>
        )}
        {!isInitialLoading && (
          <>
            {unauthorizedTransformsWarning}

            {showNodeInfo && transformNodesErrorMessage !== null && (
              <ErrorMessageCallout
                text={
                  <FormattedMessage
                    id="xpack.transform.list.transformNodesErrorPromptTitle"
                    defaultMessage="An error occurred getting the number of transform nodes."
                  />
                }
                errorMessage={transformNodesErrorMessage}
              />
            )}
            {transformsErrorMessage !== null && (
              <ErrorMessageCallout
                text={
                  <FormattedMessage
                    id="xpack.transform.list.transformListErrorPromptTitle"
                    defaultMessage="An error occurred getting the transform list."
                  />
                }
                errorMessage={transformsErrorMessage}
              />
            )}
            {transformsStatsErrorMessage !== null ? (
              <ErrorMessageCallout
                text={
                  <FormattedMessage
                    id="xpack.transform.list.transformStatsErrorPromptTitle"
                    defaultMessage="An error occurred getting the transform stats."
                  />
                }
                errorMessage={transformsStatsErrorMessage}
              />
            ) : null}
            <EuiSpacer size="s" />

            <TransformStatsBar transformNodes={transformNodes} transformsList={transforms} />
            <EuiSpacer size="s" />

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
                      onClick={() =>
                        deleteTransforms(
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
                        )
                      }
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
              {(transformNodes > 0 || transforms.length > 0) && (
                <TransformList
                  isLoading={transformsWithoutStatsLoading}
                  onCreateTransform={onOpenModal}
                  transformNodes={transformNodes}
                  transforms={transforms}
                  transformsLoading={transformsWithoutStatsLoading}
                  transformsStatsLoading={transformsStatsLoading}
                  pageState={transformPageState as ListingPageUrlState}
                  updatePageState={setTransformPageState}
                />
              )}
              <TransformAlertFlyoutWrapper />
            </AlertRulesManageContext.Provider>
          </>
        )}
      </EuiPageTemplate.Section>

      {isSearchSelectionVisible && (
        <EuiModal
          onClose={onCloseModal}
          className="transformCreateTransformSearchDialog"
          data-test-subj="transformSelectSourceModal"
        >
          <SearchSelection
            onSearchSelected={onSearchSelected}
            canEditDataView={canEditDataView}
            createNewDataView={createNewDataView}
          />
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
    <CapabilitiesWrapper requiredCapabilities={'canGetTransform'}>
      <UrlStateProvider>
        <TransformManagement />
      </UrlStateProvider>
    </CapabilitiesWrapper>
  );
};
