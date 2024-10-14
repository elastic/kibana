/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiTextColor,
  EuiLink,
  EuiFlexGrid,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import {
  CodeBox,
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
  getLanguageDefinitionCodeSnippet,
  getConsoleRequest,
} from '@kbn/search-api-panels';
import { StatusDetails } from './status_details';
import type { Index } from '../../../../../../../common';
import { useAppContext } from '../../../../../app_context';
import { documentationService } from '../../../../../services';
import { languageDefinitions, curlDefinition } from './languages';
import { DataStreamDetails } from './data_stream_details';
import { StorageDetails } from './storage_details';
import { AliasesDetails } from './aliases_details';

interface Props {
  indexDetails: Index;
}

export const DetailsPageOverview: React.FunctionComponent<Props> = ({ indexDetails }) => {
  const {
    name,
    status,
    health,
    documents,
    documents_deleted: documentsDeleted,
    primary,
    replica,
    aliases,
    data_stream: dataStream,
    size,
    primary_size: primarySize,
  } = indexDetails;
  const {
    core,
    plugins,
    services: { extensionsService },
  } = useAppContext();

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageDefinition>(curlDefinition);

  const [elasticsearchUrl, setElasticsearchUrl] = useState<string>('');

  useEffect(() => {
    plugins.cloud?.fetchElasticsearchConfig().then((config) => {
      setElasticsearchUrl(config.elasticsearchUrl || 'https://your_deployment_url');
    });
  }, [plugins.cloud]);

  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: elasticsearchUrl,
    apiKey: 'your_api_key',
    indexName: name,
  };

  const isLarge = useIsWithinBreakpoints(['xl']);

  return (
    <>
      <EuiFlexGrid columns={isLarge ? 3 : 1}>
        <StorageDetails size={size} primarySize={primarySize} primary={primary} replica={replica} />

        <StatusDetails
          documents={documents}
          documentsDeleted={documentsDeleted!}
          status={status}
          health={health}
        />

        <AliasesDetails aliases={aliases} />

        {dataStream && <DataStreamDetails dataStreamName={dataStream} />}
      </EuiFlexGrid>

      <EuiSpacer />

      {extensionsService.indexOverviewContent ? (
        extensionsService.indexOverviewContent.renderContent({
          index: indexDetails,
          getUrlForApp: core.getUrlForApp,
        })
      ) : (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2>
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.addMoreDataTitle', {
                  defaultMessage: 'Add data to this index',
                })}
              </h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiTextColor color="subdued">
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.idxMgmt.indexDetails.overviewTab.addMoreDataDescription"
                    defaultMessage="Use the bulk API to add data to your index. {docsLink}"
                    values={{
                      docsLink: (
                        <EuiLink href={documentationService.getBulkApi()} target="_blank" external>
                          <FormattedMessage
                            id="xpack.idxMgmt.indexDetails.overviewTab.addDocsLink"
                            defaultMessage="Learn more."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiText>
            </EuiTextColor>
          </EuiFlexItem>

          <EuiFlexItem>
            <CodeBox
              languages={languageDefinitions}
              codeSnippet={getLanguageDefinitionCodeSnippet(
                selectedLanguage,
                'ingestDataIndex',
                codeSnippetArguments
              )}
              selectedLanguage={selectedLanguage}
              setSelectedLanguage={setSelectedLanguage}
              assetBasePath={core.http.basePath.prepend(`/plugins/indexManagement/assets`)}
              sharePlugin={plugins.share}
              application={core.application}
              consoleRequest={getConsoleRequest('ingestDataIndex', codeSnippetArguments)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
};
