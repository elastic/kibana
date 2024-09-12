/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCallOut,
  EuiFlexGroup,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useTheme } from '@kbn/observability-utils-browser/hooks/use_theme';
import { css } from '@emotion/css';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { ServiceExtractionList } from './service_extraction_list';

export function TaskAccordion({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      className={css`
        border: 1px solid ${theme.colors.lightShade};
      `}
    >
      <EuiAccordion
        borders="none"
        paddingSize="none"
        id={id}
        buttonClassName={css`
          text-decoration: none;
        `}
        buttonContent={
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            className={css`
              padding-left: 8px;
            `}
          >
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon size="m" type={icon} />
              <EuiTitle size="xs">
                <h3>{title}</h3>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText size="xs">{description}</EuiText>
          </EuiFlexGroup>
        }
      >
        <EuiPanel hasBorder={false} hasShadow={false}>
          {children}
        </EuiPanel>
      </EuiAccordion>
    </EuiPanel>
  );
}

export function DatasetAnalysisView() {
  const {
    query: { indexPatterns: indexPatternsFromQuery },
  } = useInventoryParams('/data_stream/analyze');

  const indexPatterns = useMemo(
    () => indexPatternsFromQuery.split(',').map((indexPattern) => indexPattern.trim()),
    [indexPatternsFromQuery]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiTitle>
        <h2>
          {i18n.translate('xpack.inventory.datasetAnalysisView.title', {
            defaultMessage: 'Dataset analysis',
          })}
        </h2>
      </EuiTitle>
      <EuiCallOut
        title={i18n.translate('xpack.inventory.datasetAnalysisView.runAnalysisPanelLabel', {
          defaultMessage: 'Analyze {count, plural, one {# dataset} other {# datasets}}',
          values: {
            count: indexPatterns.length,
          },
        })}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiText size="xs">
            {indexPatterns.length > 5
              ? indexPatterns
                  .slice(0, 5)
                  .concat(
                    i18n.translate('xpack.inventory.datasetAnalysisView.andOtherDatasets', {
                      defaultMessage: 'and {count, plural, one {# other} other {# others}}',
                      values: {
                        count: indexPatterns.length - 5,
                      },
                    })
                  )
                  .join(', ')
              : indexPatterns.join(', ')}
          </EuiText>
        </EuiFlexGroup>
      </EuiCallOut>
      <EuiFlexGroup direction="column" gutterSize="s">
        <TaskAccordion
          id="service_definition"
          title={i18n.translate('xpack.inventory.datasetAnalysisView.serviceDefinitionsTitle', {
            defaultMessage: 'Service definitions',
          })}
          description={i18n.translate(
            'xpack.inventory.datasetAnalysisView.serviceExtractionDescription',
            {
              defaultMessage: 'Extract and manage service definitions for these datasets',
            }
          )}
          icon="node"
        >
          <ServiceExtractionList indexPatterns={indexPatterns} />
        </TaskAccordion>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
