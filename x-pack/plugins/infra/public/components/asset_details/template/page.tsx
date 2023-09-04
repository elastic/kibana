/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiPageTemplate } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibanaHeader } from '../../../hooks/use_kibana_header';
import { InfraLoadingPanel } from '../../loading';
import { Content } from '../content/content';
import { useAssetDetailsRenderPropsContext } from '../hooks/use_asset_details_render_props';
import { usePageHeader } from '../hooks/use_page_header';
import type { ContentTemplateProps } from '../types';

export const Page = ({ header: { tabs = [], links = [] } }: ContentTemplateProps) => {
  const { asset, loading } = useAssetDetailsRenderPropsContext();
  const { rightSideItems, tabEntries, breadcrumbs } = usePageHeader(tabs, links);
  const { headerHeight } = useKibanaHeader();

  return loading ? (
    <EuiFlexGroup
      direction="column"
      css={css`
        height: calc(100vh - ${headerHeight}px);
      `}
    >
      <InfraLoadingPanel
        height="100%"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    </EuiFlexGroup>
  ) : (
    <EuiPageTemplate
      panelled
      contentBorder={false}
      offset={0}
      restrictWidth={false}
      style={{ minBlockSize: `calc(100vh - ${headerHeight}px)` }}
    >
      <EuiPageTemplate.Section paddingSize="none">
        <EuiPageTemplate.Header
          pageTitle={asset.name}
          tabs={tabEntries}
          rightSideItems={rightSideItems}
          breadcrumbs={breadcrumbs}
        />
        <EuiPageTemplate.Section grow>
          <Content />
        </EuiPageTemplate.Section>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
