/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
  EuiTourStep,
} from '@elastic/eui';
import {
  PagingInfo,
  Results,
  ResultsPerPage,
  SearchBox,
  SearchProvider,
} from '@elastic/react-search-ui';
import { SearchDriverOptions } from '@elastic/search-ui';
import EnginesAPIConnector, {
  Transporter,
  SearchRequest,
  SearchResponse,
} from '@elastic/search-ui-engines-connector';
import { HttpSetup } from '@kbn/core-http-browser';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { HttpLogic } from '../../../../shared/http';
import { KibanaLogic } from '../../../../shared/kibana';
import { TelemetryLogic } from '../../../../shared/telemetry';
import {
  SearchApplicationViewTabs,
  SearchApplicationConnectTabs,
  SearchApplicationContentTabs,
  SEARCH_APPLICATION_CONNECT_PATH,
  SEARCH_APPLICATION_CONTENT_PATH,
} from '../../../routes';
import { EnterpriseSearchApplicationsPageTemplate } from '../../layout/page_template';

import { SearchApplicationIndicesLogic } from '../search_application_indices_logic';
import { SearchApplicationViewLogic } from '../search_application_view_logic';
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
========

import { APICallData, APICallFlyout } from './api_call_flyout';
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx

import { APICallData, APICallFlyout } from './api_call_flyout';

import { SearchApplicationDocsExplorerLogic } from './docs_explorer_logic';
import { DocumentProvider } from './document_context';
import { DocumentFlyout } from './document_flyout';
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
========
import { SearchApplicationSearchPreviewLogic } from './search_preview_logic';
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx

import {
  PagingInfoView,
  RESULTS_PER_PAGE_OPTIONS,
  ResultView,
  ResultsPerPageView,
  ResultsView,
  Sorting,
  SearchBar,
} from './search_ui_components';
import '../search_application_layout.scss';

class InternalSearchApplicationTransporter implements Transporter {
  constructor(
    private http: HttpSetup,
    private searchApplicationName: string,
    private setLastAPICall: (apiCallData: APICallData) => void
  ) {}

  async performRequest(request: SearchRequest) {
    const url = `/internal/enterprise_search/search_applications/${this.searchApplicationName}/search`;

    const response = await this.http.post<SearchResponse>(url, {
      body: JSON.stringify(request),
    });

    this.setLastAPICall({ request, response });

    const withUniqueIds = {
      ...response,
      hits: {
        ...response.hits,
        hits: response.hits.hits.map((hit) => ({
          ...hit,
          // The `__id` field is the actual document ID.
          __id: hit._id,
          // Search UI expects a unique `_id` for use as a React key but
          // because Search Applications can have multiple indices, keys
          // can be duplicated. Here we prefix the `_id` with the index
          // name to ensure uniqueness.
          _id: `${hit._index}__${hit._id}`,
        })),
      },
    };

    return withUniqueIds;
  }
}

interface ConfigurationPopOverProps {
  hasSchemaConflicts: boolean;
  searchApplicationName: string;
  setCloseConfiguration: () => void;
  showConfiguration: boolean;
}

const ConfigurationPopover: React.FC<ConfigurationPopOverProps> = ({
  searchApplicationName,
  hasSchemaConflicts,
  setCloseConfiguration,
  showConfiguration,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const { searchApplicationData } = useValues(SearchApplicationViewLogic);
  const { openDeleteSearchApplicationModal } = useActions(SearchApplicationViewLogic);
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const [isTourClosed, setTourClosed] = useLocalStorage<boolean>(
    'search-application-tour-closed',
    false
  );

  return (
    <>
      <EuiPopover
        anchorPosition="downCenter"
        isOpen={showConfiguration}
        panelPaddingSize="none"
        closePopover={setCloseConfiguration}
        button={
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            {hasSchemaConflicts && (
              <>
                <EuiFlexItem>
                  <EuiIcon type="alert" color="danger" />
                </EuiFlexItem>
                {!isTourClosed && <EuiSpacer size="xs" />}
              </>
            )}
            <EuiFlexItem>
              <EuiTourStep
                display="block"
                decoration="beacon"
                content={
                  <EuiText>
                    <p>
                      {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.tourContent',
========
                        'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.tourContent',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                        {
                          defaultMessage:
                            'Create your API key, learn about using language clients and find more resources in Connect.',
                        }
                      )}
                    </p>
                  </EuiText>
                }
                isStepOpen={!isTourClosed}
                maxWidth={360}
                hasArrow
                step={1}
                onFinish={() => {
                  setTourClosed(true);
                }}
                stepsTotal={1}
                anchorPosition="downCenter"
                title={i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                  'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.tourTitle',
========
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.tourTitle',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                  {
                    defaultMessage: 'Review our API page to start using your search application',
                  }
                )}
              >
                <></>
              </EuiTourStep>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiButtonEmpty
                color="primary"
                iconType="arrowDown"
                iconSide="right"
                onClick={setCloseConfiguration}
              >
                {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                  'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.buttonTitle',
========
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.buttonTitle',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                  {
                    defaultMessage: 'Configuration',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <EuiContextMenuPanel style={{ width: 300 }}>
          <EuiPanel color="transparent" paddingSize="s">
            <EuiTitle size="xxxs">
              <p>
                {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                  'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.contentTitle',
========
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.contentTitle',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                  {
                    defaultMessage: 'Content',
                  }
                )}
              </p>
            </EuiTitle>
          </EuiPanel>
          <EuiHorizontalRule margin="none" />

          <EuiContextMenuItem
            key="Indices"
            icon="tableDensityExpanded"
            onClick={() =>
              navigateToUrl(
                generateEncodedPath(SEARCH_APPLICATION_CONTENT_PATH, {
                  contentTabId: SearchApplicationContentTabs.INDICES,
                  searchApplicationName,
                })
              )
            }
          >
            {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
              'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.content.Indices',
========
              'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.content.Indices',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
              {
                defaultMessage: 'Indices',
              }
            )}
          </EuiContextMenuItem>
          <EuiContextMenuItem
            key="Schema"
            icon={hasSchemaConflicts ? <EuiIcon type="warning" color="danger" /> : 'kqlField'}
            onClick={() =>
              navigateToUrl(
                generateEncodedPath(SEARCH_APPLICATION_CONTENT_PATH, {
                  contentTabId: SearchApplicationContentTabs.SCHEMA,
                  searchApplicationName,
                })
              )
            }
          >
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <FormattedMessage
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.content.schema"
========
                id="xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.content.schema"
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                defaultMessage="Schema"
              />
              {hasSchemaConflicts && (
                <EuiText size="s" color="danger">
                  <FormattedMessage
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                    id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.content.schemaConflict"
========
                    id="xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.content.schemaConflict"
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                    defaultMessage="Conflict"
                  />
                </EuiText>
              )}
            </EuiFlexGroup>
          </EuiContextMenuItem>

          <EuiPanel color="transparent" paddingSize="s">
            <EuiTitle size="xxxs">
              <p>
                {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                  'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.connectTitle',
========
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.connectTitle',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                  {
                    defaultMessage: 'Connect',
                  }
                )}
              </p>
            </EuiTitle>
          </EuiPanel>
          <EuiHorizontalRule margin="none" />
          <EuiContextMenuItem
            key="Api"
            icon="lock"
            onClick={() =>
              navigateToUrl(
                generateEncodedPath(SEARCH_APPLICATION_CONNECT_PATH, {
                  connectTabId: SearchApplicationConnectTabs.SEARCHAPI,
                  searchApplicationName,
                })
              )
            }
          >
            {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
              'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.connect.Api',
========
              'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.connect.Api',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
              {
                defaultMessage: 'API',
              }
            )}
          </EuiContextMenuItem>

          <EuiPanel color="transparent" paddingSize="s">
            <EuiTitle size="xxxs">
              <p>
                {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                  'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.settingsTitle',
========
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.settingsTitle',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                  {
                    defaultMessage: 'Settings',
                  }
                )}
              </p>
            </EuiTitle>
          </EuiPanel>
          <EuiHorizontalRule margin="none" />
          <EuiContextMenuItem
            key="delete"
            icon={<EuiIcon type="trash" color="danger" />}
            onClick={() => {
              if (searchApplicationData) {
                openDeleteSearchApplicationModal();
                sendEnterpriseSearchTelemetry({
                  action: 'clicked',
                  metric: 'entSearchApplications-searchApplicationView-deleteSearchApplication',
                });
              }
            }}
          >
            <EuiTextColor color="danger">
              <p>
                {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                  'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.configuration.settings.delete',
========
                  'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.configuration.settings.delete',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                  {
                    defaultMessage: 'Delete this app',
                  }
                )}
              </p>
            </EuiTextColor>
          </EuiContextMenuItem>
        </EuiContextMenuPanel>
      </EuiPopover>
    </>
  );
};
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
export const SearchApplicationDocsExplorer: React.FC = () => {
========
export const SearchApplicationSearchPreview: React.FC = () => {
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
  const { http } = useValues(HttpLogic);
  const [showAPICallFlyout, setShowAPICallFlyout] = useState<boolean>(false);
  const [showConfigurationPopover, setShowConfigurationPopover] = useState<boolean>(false);
  const [lastAPICall, setLastAPICall] = useState<null | APICallData>(null);
  const { searchApplicationName, isLoadingSearchApplication, hasSchemaConflicts } = useValues(
    SearchApplicationViewLogic
  );
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
  const { resultFields, sortableFields } = useValues(SearchApplicationDocsExplorerLogic);
========
  const { resultFields, sortableFields } = useValues(SearchApplicationSearchPreviewLogic);
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
  const { searchApplicationData } = useValues(SearchApplicationIndicesLogic);

  const config: SearchDriverOptions = useMemo(() => {
    const transporter = new InternalSearchApplicationTransporter(
      http,
      searchApplicationName,
      setLastAPICall
    );
    const connector = new EnginesAPIConnector(transporter);

    return {
      alwaysSearchOnInitialLoad: true,
      apiConnector: connector,
      hasA11yNotifications: true,
      searchQuery: {
        result_fields: resultFields,
      },
    };
  }, [http, searchApplicationName, setLastAPICall, resultFields]);

  if (!searchApplicationData) return null;

  return (
    <EnterpriseSearchApplicationsPageTemplate
      pageChrome={[
        searchApplicationName,
        i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
          'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.pageChrome',
          {
            defaultMessage: 'Docs Explorer',
          }
        ),
      ]}
      pageViewTelemetry={SearchApplicationViewTabs.DOCS_EXPLORER}
========
          'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.pageChrome',
          {
            defaultMessage: 'Search Preview',
          }
        ),
      ]}
      pageViewTelemetry={SearchApplicationViewTabs.PREVIEW}
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
      isLoading={isLoadingSearchApplication}
      pageHeader={{
        bottomBorder: false,
        className: 'searchApplicationHeaderBackgroundColor',
        pageTitle: searchApplicationName,
        rightSideItems: [
          <>
            <ConfigurationPopover
              searchApplicationName={searchApplicationName}
              hasSchemaConflicts={hasSchemaConflicts}
              showConfiguration={showConfigurationPopover}
              setCloseConfiguration={() => setShowConfigurationPopover(!showConfigurationPopover)}
            />
          </>,
        ],
      }}
      searchApplicationName={searchApplicationName}
      hasSchemaConflicts={hasSchemaConflicts}
    >
      <DocumentProvider>
        <SearchProvider config={config}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <SearchBox
                inputView={({ getInputProps }) => (
                  <SearchBar
                    additionalInputProps={getInputProps({
                      append: (
                        <EuiButtonEmpty
                          color="primary"
                          iconType="eye"
                          onClick={() => setShowAPICallFlyout(true)}
                          isLoading={lastAPICall == null}
                        >
                          {i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                            'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.inputView.appendButtonLabel',
========
                            'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.inputView.appendButtonLabel',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                            { defaultMessage: 'View API call' }
                          )}
                        </EuiButtonEmpty>
                      ),
                      placeholder: i18n.translate(
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
                        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.inputView.placeholder',
========
                        'xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.inputView.placeholder',
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
                        { defaultMessage: 'Search' }
                      ),
                    })}
                  />
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false} css={{ minWidth: '240px' }}>
              <ResultsPerPage view={ResultsPerPageView} options={RESULTS_PER_PAGE_OPTIONS} />
              <EuiSpacer size="m" />
              <Sorting sortableFields={sortableFields} />
              <EuiSpacer size="m" />
<<<<<<<< HEAD:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/docs_explorer/docs_explorer.tsx
========
              <EuiLink href={docLinks.searchTemplates} target="_blank">
                <FormattedMessage
                  id="xpack.enterpriseSearch.searchApplications.searchApplication.searchPreview.improveResultsLink"
                  defaultMessage="Improve these results"
                />
              </EuiLink>
>>>>>>>> whats-new:x-pack/plugins/enterprise_search/public/applications/applications/components/search_application/search_preview/search_preview.tsx
            </EuiFlexItem>
            <EuiFlexItem>
              <PagingInfo view={PagingInfoView} />
              <EuiSpacer size="m" />
              <Results view={ResultsView} resultView={ResultView} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SearchProvider>
        <DocumentFlyout />
        {showAPICallFlyout && lastAPICall && (
          <APICallFlyout
            onClose={() => setShowAPICallFlyout(false)}
            lastAPICall={lastAPICall}
            searchApplicationName={searchApplicationName}
          />
        )}
      </DocumentProvider>
    </EnterpriseSearchApplicationsPageTemplate>
  );
};
