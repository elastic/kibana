/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { ChangePointDetection } from '@kbn/aiops-plugin/public';

import { useMlContext } from '../contexts/ml';
import { useMlKibana } from '../contexts/kibana';
import { HelpMenu } from '../components/help_menu';
import { TechnicalPreviewBadge } from '../components/technical_preview_badge';

import { MlPageHeader } from '../components/page_header';

export const ChangePointDetectionPage: FC = () => {
  const { services } = useMlKibana();

  const context = useMlContext();
  const dataView = context.currentDataView;
  const savedSearch = context.selectedSavedSearch;

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
          appDependencies={pick(services, [
            'application',
            'data',
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
          ])}
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
