/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Index } from '@kbn/index-management';

import {
  EuiAccordion,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiI18nNumber,
  EuiIcon,
  EuiPanel,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Mappings } from '../../types';
import { countVectorBasedTypesFromMappings } from './mappings_convertor';

interface BaseQuickStatProps {
  icon: string;
  iconColor: string;
  title: string;
  secondaryTitle: React.ReactNode;
  open: boolean;
  content?: React.ReactNode;
  stats: Array<{
    title: string;
    description?: React.ReactNode;
  }>;
  setOpen: (open: boolean) => void;
  first?: boolean;
}

const QuickStat: React.FC<BaseQuickStatProps> = ({
  icon,
  title,
  stats,
  open,
  setOpen,
  first,
  secondaryTitle,
  iconColor,
  content,
}) => {
  const { euiTheme } = useEuiTheme();

  const id = useGeneratedHtmlId({
    prefix: 'formAccordion',
    suffix: title,
  });

  return (
    <EuiAccordion
      forceState={open ? 'open' : 'closed'}
      onToggle={() => setOpen(!open)}
      paddingSize="none"
      id={id}
      buttonElement="div"
      arrowDisplay="right"
      css={{
        borderLeft: euiTheme.border.thin,
        ...(first ? { borderLeftWidth: 0 } : {}),
        '.euiAccordion__arrow': {
          marginRight: euiTheme.size.s,
        },
        '.euiAccordion__triggerWrapper': {
          background: euiTheme.colors.ghost,
        },
        '.euiAccordion__children': {
          borderTop: euiTheme.border.thin,
          padding: euiTheme.size.m,
        },
      }}
      buttonContent={
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={icon} color={iconColor} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h4>{title}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">{secondaryTitle}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      }
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          {content ? (
            content
          ) : (
            <EuiDescriptionList
              type="column"
              listItems={stats}
              columnWidths={[3, 1]}
              compressed
              descriptionProps={{
                color: 'subdued',
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

interface QuickStatsProps {
  index: Index;
  mappings: Mappings;
}

export const SetupAISearchButton: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiText>
          {i18n.translate('xpack.searchIndices.quickStats.setup_ai_search_description', {
            defaultMessage: 'Use Elastic to build powerful AI Search',
          })}
        </EuiText>
        <EuiButton
          href="https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-search.html"
          target="_blank"
        >
          {i18n.translate('xpack.searchIndices.quickStats.setup_ai_search_button', {
            defaultMessage: 'Setup now',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
}

export const QuickStats: React.FC<QuickStatsProps> = ({ index, mappings }) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const { euiTheme } = useEuiTheme();
  const mappingStats = countVectorBasedTypesFromMappings(mappings);
  const vectorFieldCount =
    mappingStats.sparse_vector + mappingStats.dense_vector + mappingStats.semantic_text;

  return (
    <EuiPanel
      paddingSize="none"
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
            secondaryTitle={<EuiI18nNumber value={index.documents ?? 0} />}
            stats={[
              { title: 'Total', description: <EuiI18nNumber value={index.documents ?? 0} /> },
              { title: 'Index Size', description: index.size },
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
            secondaryTitle={
              vectorFieldCount > 0
                ? i18n.translate('xpack.searchIndices.quickStats.total_count', {
                  defaultMessage: '{value} Field',
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
                  defaultMessage: '{value} Field',
                  values: { value: mappingStats.sparse_vector },
                }),
              },
              {
                title: i18n.translate('xpack.searchIndices.quickStats.dense_vector', {
                  defaultMessage: 'Dense Vector',
                }),
                description: i18n.translate('xpack.searchIndices.quickStats.dense_vector_count', {
                  defaultMessage: '{value} Field',
                  values: { value: mappingStats.dense_vector },
                }),
              },
              {
                title: i18n.translate('xpack.searchIndices.quickStats.semantic_text', {
                  defaultMessage: 'Semantic Text',
                }),
                description: i18n.translate('xpack.searchIndices.quickStats.semantic_text_count', {
                  defaultMessage: '{value} Field',
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
