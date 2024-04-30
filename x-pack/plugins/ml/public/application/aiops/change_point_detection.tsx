/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { ChangePointDetection } from '@kbn/aiops-plugin/public';

import { useDataSource } from '../contexts/ml/data_source_context';
import { useFieldStatsTrigger, FieldStatsFlyoutProvider } from '../components/field_stats_flyout';
import { useMlKibana } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';

import { MlPageHeader } from '../components/page_header';
import { useEnabledFeatures } from '../contexts/ml/serverless_context';

export const ChangePointDetectionPage: FC = () => {
  const { services } = useMlKibana();
  const { showNodeInfo } = useEnabledFeatures();

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.changePointDetection.pageHeader"
              defaultMessage="Change point detection"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      {dataView ? (
        <ChangePointDetection
          dataView={dataView}
          savedSearch={savedSearch}
          showFrozenDataTierChoice={showNodeInfo}
          appDependencies={{
            ...pick(services, [
              'analytics',
              'application',
              'cases',
              'charts',
              'data',
              'embeddable',
              'executionContext',
              'fieldFormats',
              'http',
              'i18n',
              'lens',
              'notifications',
              'presentationUtil',
              'share',
              'storage',
              'theme',
              'uiActions',
              'uiSettings',
              'unifiedSearch',
              'usageCollection',
            ]),
            fieldStats: { useFieldStatsTrigger, FieldStatsFlyoutProvider },
          }}
        />
      ) : null}
      <HelpMenu
        docLink={services.docLinks.links.aggs.change_point}
        appName={i18n.translate('xpack.ml.changePointDetection.pageHeader', {
          defaultMessage: 'Change point detection',
        })}
      />
    </>
  );
};
