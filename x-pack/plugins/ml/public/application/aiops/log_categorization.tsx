/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { pick } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LogCategorization } from '@kbn/aiops-plugin/public';
import { useDataSource } from '../contexts/ml/data_source_context';
import { useMlKibana, useIsServerless } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';
import { MlPageHeader } from '../components/page_header';

export const LogCategorizationPage: FC = () => {
  const { services } = useMlKibana();
  const isServerless = useIsServerless();

  const { selectedDataView: dataView, selectedSavedSearch: savedSearch } = useDataSource();

  return (
    <>
      <MlPageHeader>
        <EuiFlexGroup responsive={false} wrap={false} alignItems={'center'} gutterSize={'m'}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.logCategorization.pageHeader"
              defaultMessage="Log pattern analysis"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MlPageHeader>
      {dataView && (
        <LogCategorization
          dataView={dataView}
          savedSearch={savedSearch}
          isServerless={isServerless}
          appDependencies={pick(services, [
            'application',
            'data',
            'executionContext',
            'charts',
            'fieldFormats',
            'http',
            'notifications',
            'share',
            'storage',
            'uiSettings',
            'unifiedSearch',
            'theme',
            'lens',
            'i18n',
          ])}
        />
      )}
      <HelpMenu docLink={services.docLinks.links.ml.guide} />
    </>
  );
};
