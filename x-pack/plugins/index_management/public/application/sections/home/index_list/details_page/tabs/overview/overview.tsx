/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import {
  CodeBox,
  LanguageDefinition,
  LanguageDefinitionSnippetArguments,
} from '@kbn/search-api-panels';
import type { Index } from '../../../../../../../../common';
import { useAppContext } from '../../../../../../app_context';
import { languageDefinitions, curlDefinition } from './languages';

const getCodeSnippet = (
  language: LanguageDefinition,
  key: keyof LanguageDefinition,
  args: LanguageDefinitionSnippetArguments
): string => {
  const snippetVal = language[key];
  if (snippetVal === undefined) return '';
  if (typeof snippetVal === 'string') return snippetVal;
  return snippetVal(args);
};

const unknownLabel = i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.unknownLabel', {
  defaultMessage: 'Unknown',
});

interface Props {
  indexDetails: Index;
}

export const OverviewTab: React.FunctionComponent<Props> = ({ indexDetails }) => {
  const {
    name,
    status,
    documents,
    documents_deleted: documentsDeleted,
    primary,
    replica,
    aliases,
  } = indexDetails;
  const { config, core, plugins } = useAppContext();

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageDefinition>(curlDefinition);

  // const elasticsearchURL = useMemo(() => {
  //   return cloud?.elasticsearchUrl ?? ELASTICSEARCH_URL_PLACEHOLDER;
  // }, [cloud]);

  // TODO do no hardcode
  const codeSnippetArguments: LanguageDefinitionSnippetArguments = {
    url: 'https://your_deployment_url',
    apiKey: 'yourApiKey',
    indexName: name,
  };

  return (
    <>
      <EuiFlexGroup>
        {config.enableIndexStats && (
          <EuiFlexItem data-test-subj="overviewTabIndexStats">
            <EuiPanel>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiStat
                    title={status}
                    titleColor={status === 'open' ? 'success' : 'danger'}
                    description={i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.statusLabel',
                      {
                        defaultMessage: 'Status',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={documents}
                    titleColor="primary"
                    description={i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.documentsLabel',
                      {
                        defaultMessage: 'Documents',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={documentsDeleted}
                    description={i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.documentsDeletedLabel',
                      {
                        defaultMessage: 'Documents deleted',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}

        <EuiFlexItem data-test-subj="overviewTabIndexDetails">
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiStat
                  title={primary ? primary : unknownLabel}
                  description={i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.primaryLabel',
                    {
                      defaultMessage: 'Primaries',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={replica ? replica : unknownLabel}
                  description={i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.replicaLabel',
                    {
                      defaultMessage: 'Replicas',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={aliases}
                  description={i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.aliasesLabel',
                    {
                      defaultMessage: 'Aliases',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.addMoreDataTitle', {
                defaultMessage: 'Add more data to this index',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiTextColor color="subdued">
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.addMoreDataDescription', {
                  defaultMessage:
                    'Keep adding more documents to your already created index using the API',
                })}
              </p>
            </EuiText>
          </EuiTextColor>
        </EuiFlexItem>

        <EuiFlexItem>
          <CodeBox
            languages={languageDefinitions}
            codeSnippet={getCodeSnippet(selectedLanguage, 'ingestDataIndex', codeSnippetArguments)}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            http={core.http}
            pluginId={'indexManagement'}
            sharePlugin={plugins.share}
            application={core.application}
            // This feature does not appear to work as expected
            // Fix in progress: https://github.com/elastic/kibana/pull/164766
            showTryInConsole
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
