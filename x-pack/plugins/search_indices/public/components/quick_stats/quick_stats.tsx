/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Index } from '@kbn/index-management-shared-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiI18nNumber,
  EuiPanel,
  EuiText,
  useEuiTheme,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Mappings } from '../../types';
import { countVectorBasedTypesFromMappings } from './mappings_convertor';
import { QuickStat } from './quick_stat';
import { useKibana } from '../../hooks/use_kibana';

export interface QuickStatsProps {
  index: Index;
  mappings: Mappings;
}

export const SetupAISearchButton: React.FC = () => {
  const {
    services: { docLinks },
  } = useKibana();
  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="transparent">
      <EuiFlexGroup gutterSize="s" direction="column" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <h6>
              {i18n.translate('xpack.searchIndices.quickStats.setup_ai_search_description', {
                defaultMessage: 'Build AI-powered search experiences with Elastic',
              })}
            </h6>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            href={docLinks.links.enterpriseSearch.semanticSearch}
            target="_blank"
            data-test-subj="setupAISearchButton"
          >
            {i18n.translate('xpack.searchIndices.quickStats.setup_ai_search_button', {
              defaultMessage: 'Set up now',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const QuickStats: React.FC<QuickStatsProps> = ({ index, mappings }) => {
  const [open, setOpen] = useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const mappingStats = useMemo(() => countVectorBasedTypesFromMappings(mappings), [mappings]);
  const vectorFieldCount =
    mappingStats.sparse_vector + mappingStats.dense_vector + mappingStats.semantic_text;

  return (
    <EuiPanel
      paddingSize="none"
      data-test-subj="quickStats"
      hasShadow={false}
      css={() => ({
        border: euiTheme.border.thin,
        background: euiTheme.colors.lightestShade,
        overflow: 'hidden',
      })}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <QuickStat
            open={open}
            setOpen={setOpen}
            icon="documents"
            iconColor="black"
            title={i18n.translate('xpack.searchIndices.quickStats.document_count_heading', {
              defaultMessage: 'Document count',
            })}
            data-test-subj="QuickStatsDocumentCount"
            secondaryTitle={<EuiI18nNumber value={index.documents ?? 0} />}
            stats={[
              {
                title: i18n.translate('xpack.searchIndices.quickStats.documents.totalTitle', {
                  defaultMessage: 'Total',
                }),
                description: <EuiI18nNumber value={index.documents ?? 0} />,
              },
              {
                title: i18n.translate('xpack.searchIndices.quickStats.documents.indexSize', {
                  defaultMessage: 'Index Size',
                }),
                description: index.size ?? '0b',
              },
            ]}
            first
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <QuickStat
            open={open}
            setOpen={setOpen}
            icon="sparkles"
            iconColor="black"
            title={i18n.translate('xpack.searchIndices.quickStats.ai_search_heading', {
              defaultMessage: 'AI Search',
            })}
            data-test-subj="QuickStatsAIMappings"
            secondaryTitle={
              vectorFieldCount > 0
                ? i18n.translate('xpack.searchIndices.quickStats.total_count', {
                    defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
                    values: {
                      value: vectorFieldCount,
                    },
                  })
                : i18n.translate('xpack.searchIndices.quickStats.no_vector_fields', {
                    defaultMessage: 'Not configured',
                  })
            }
            content={vectorFieldCount === 0 && <SetupAISearchButton />}
            stats={[
              {
                title: i18n.translate('xpack.searchIndices.quickStats.sparse_vector', {
                  defaultMessage: 'Sparse Vector',
                }),
                description: i18n.translate('xpack.searchIndices.quickStats.sparse_vector_count', {
                  defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
                  values: { value: mappingStats.sparse_vector },
                }),
              },
              {
                title: i18n.translate('xpack.searchIndices.quickStats.dense_vector', {
                  defaultMessage: 'Dense Vector',
                }),
                description: i18n.translate('xpack.searchIndices.quickStats.dense_vector_count', {
                  defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
                  values: { value: mappingStats.dense_vector },
                }),
              },
              {
                title: i18n.translate('xpack.searchIndices.quickStats.semantic_text', {
                  defaultMessage: 'Semantic Text',
                }),
                description: i18n.translate('xpack.searchIndices.quickStats.semantic_text_count', {
                  defaultMessage: '{value, plural, one {# Field} other {# Fields}}',
                  values: { value: mappingStats.semantic_text },
                }),
              },
            ]}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
