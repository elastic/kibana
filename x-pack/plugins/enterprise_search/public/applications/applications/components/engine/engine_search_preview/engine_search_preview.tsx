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
  EuiLink,
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

import { docLinks } from '../../../../shared/doc_links';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { HttpLogic } from '../../../../shared/http';
import { KibanaLogic } from '../../../../shared/kibana';
import { TelemetryLogic } from '../../../../shared/telemetry';
import {
  EngineViewTabs,
  SearchApplicationConnectTabs,
  SearchApplicationContentTabs,
  SEARCH_APPLICATION_CONNECT_PATH,
  SEARCH_APPLICATION_CONTENT_PATH,
} from '../../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../../layout/engines_page_template';

import { EngineIndicesLogic } from '../engine_indices_logic';
import { EngineViewLogic } from '../engine_view_logic';

import { DocumentProvider } from './document_context';
import { DocumentFlyout } from './document_flyout';
import { EngineSearchPreviewLogic } from './engine_search_preview_logic';

import {
  InputView,
  PagingInfoView,
  RESULTS_PER_PAGE_OPTIONS,
  ResultView,
  ResultsPerPageView,
  ResultsView,
  Sorting,
} from './search_ui_components';
import '../search_application_layout.scss';

class InternalEngineTransporter implements Transporter {
  constructor(
    private http: HttpSetup,
    private engineName: string // uncomment and add setLastAPICall to constructor when view this API call is needed // private setLastAPICall?: (apiCallData: APICallData) => void
  ) {}

  async performRequest(request: SearchRequest) {
    const url = `/internal/enterprise_search/search_applications/${this.engineName}/search`;

    const response = await this.http.post<SearchResponse>(url, {
      body: JSON.stringify(request),
    });

    // this.setLastAPICall({ request, response }); Uncomment when view this API call is needed

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
  engineName: string;
  hasSchemaConflicts: boolean;
  setCloseConfiguration: () => void;
  showConfiguration: boolean;
}

const ConfigurationPopover: React.FC<ConfigurationPopOverProps> = ({
  engineName,
  hasSchemaConflicts,
  setCloseConfiguration,
  showConfiguration,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const { engineData } = useValues(EngineViewLogic);
  const { openDeleteEngineModal } = useActions(EngineViewLogic);
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
                        'xpack.enterpriseSearch.content.searchApplication.searchPreview.configuration.tourContent',
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
                  'xpack.enterpriseSearch.content.searchApplication.searchPreview.configuration.tourTitle',
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
                  'xpack.enterpriseSearch.content.engine.searchPreview.configuration.buttonTitle',
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
                  'xpack.enterpriseSearch.content.engine.searchPreview.configuration.contentTitle',
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
                  engineName,
                })
              )
            }
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.engine.searchPreview.configuration.content.Indices',
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
                  engineName,
                })
              )
            }
          >
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.searchPreview.configuration.content.schema"
                defaultMessage="Schema"
              />
              {hasSchemaConflicts && (
                <EuiText size="s" color="danger">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.engine.searchPreview.configuration.content.schemaConflict"
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
                  'xpack.enterpriseSearch.content.engine.searchPreview.configuration.connectTitle',
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
                  engineName,
                })
              )
            }
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.engine.searchPreview.configuration.connect.Api',
              {
                defaultMessage: 'API',
              }
            )}
          </EuiContextMenuItem>

          <EuiPanel color="transparent" paddingSize="s">
            <EuiTitle size="xxxs">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.engine.searchPreview.configuration.settingsTitle',
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
              if (engineData) {
                openDeleteEngineModal();
                sendEnterpriseSearchTelemetry({
                  action: 'clicked',
                  metric: 'entSearchApplications-engineView-deleteEngine',
                });
              }
            }}
          >
            <EuiTextColor color="danger">
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.engine.searchPreview.configuration.settings.delete',
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
export const EngineSearchPreview: React.FC = () => {
  const { http } = useValues(HttpLogic);
  // const [showAPICallFlyout, setShowAPICallFlyout] = useState<boolean>(false);    Uncomment when view this API call is needed
  const [showConfigurationPopover, setShowConfigurationPopover] = useState<boolean>(false);
  // const [lastAPICall, setLastAPICall] = useState<null | APICallData>(null); Uncomment when view this API call is needed
  const { engineName, isLoadingEngine, hasSchemaConflicts } = useValues(EngineViewLogic);
  const { resultFields, sortableFields } = useValues(EngineSearchPreviewLogic);
  const { engineData } = useValues(EngineIndicesLogic);

  const config: SearchDriverOptions = useMemo(() => {
    const transporter = new InternalEngineTransporter(http, engineName);
    const connector = new EnginesAPIConnector(transporter);

    return {
      alwaysSearchOnInitialLoad: true,
      apiConnector: connector,
      hasA11yNotifications: true,
      searchQuery: {
        result_fields: resultFields,
      },
    };
  }, [http, engineName, resultFields]);

  if (!engineData) return null;

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[
        engineName,
        i18n.translate('xpack.enterpriseSearch.content.engine.searchPreview.pageChrome', {
          defaultMessage: 'Search Preview',
        }),
      ]}
      pageViewTelemetry={EngineViewTabs.PREVIEW}
      isLoading={isLoadingEngine}
      pageHeader={{
        bottomBorder: false,
        className: 'searchApplicationHeaderBackgroundColor',
        pageTitle: (
          <FormattedMessage
            id="xpack.enterpriseSearch.content.engine.searchPreview.pageTitle"
            defaultMessage="{engineName}"
            values={{ engineName }}
          />
        ),
        rightSideItems: [
          <>
            <ConfigurationPopover
              engineName={engineName}
              hasSchemaConflicts={hasSchemaConflicts}
              showConfiguration={showConfigurationPopover}
              setCloseConfiguration={() => setShowConfigurationPopover(!showConfigurationPopover)}
            />
          </>,
        ],
      }}
      engineName={engineName}
      hasSchemaConflicts={hasSchemaConflicts}
    >
      <DocumentProvider>
        <SearchProvider config={config}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <SearchBox inputView={InputView} />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiFlexGroup>
            <EuiFlexItem grow={false} css={{ minWidth: '240px' }}>
              <ResultsPerPage view={ResultsPerPageView} options={RESULTS_PER_PAGE_OPTIONS} />
              <EuiSpacer size="m" />
              <Sorting sortableFields={sortableFields} />
              <EuiSpacer size="m" />
              <EuiLink href={docLinks.searchTemplates} target="_blank">
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.searchPreview.improveResultsLink"
                  defaultMessage="Improve these results"
                />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <PagingInfo view={PagingInfoView} />
              <EuiSpacer size="m" />
              <Results view={ResultsView} resultView={ResultView} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </SearchProvider>
        <DocumentFlyout />
        {/*
        Uncomment when view this API call needed

        {showAPICallFlyout && lastAPICall && (
          <APICallFlyout
            onClose={() => setShowAPICallFlyout(false)}
            lastAPICall={lastAPICall}
            engineName={engineName}
          />
        )}
        */}
      </DocumentProvider>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
