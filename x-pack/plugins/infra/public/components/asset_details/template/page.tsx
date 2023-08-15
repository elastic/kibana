/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { MetricsPageTemplate } from '../../../pages/metrics/page_template';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { InfraLoadingPanel } from '../../loading';
import { Content } from '../content/content';
import { useAssetDetailsStateContext } from '../hooks/use_asset_details_state';
import { useRighSideItems } from '../hooks/use_right_side_items';
import { useTabs } from '../hooks/use_tabs';
import { ContentTemplateProps } from '../types';

export const Page = ({ header: { tabs = [], links = [] } }: ContentTemplateProps) => {
  const { asset, loading } = useAssetDetailsStateContext();
  const { tabs: tabsProp } = useTabs(tabs);
  const { components: rightSideComponents } = useRighSideItems(links);

  if (loading) {
    return (
      <MetricsPageTemplate
        pageSectionProps={{
          contentProps: {
            css: fullHeightContentStyles,
          },
        }}
      >
        <InfraLoadingPanel
          height="100%"
          width="auto"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      </MetricsPageTemplate>
    );
  }

  return (
    <MetricsPageTemplate
      pageHeader={{
        pageTitle: asset.name,
        tabs: tabsProp,
        rightSideItems: rightSideComponents,
      }}
      pageSectionProps={{
        contentProps: {
          css: fullHeightContentStyles,
        },
      }}
    >
      <Content />
    </MetricsPageTemplate>
  );
};
