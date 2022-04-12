/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiBadge, EuiToolTip, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { images } from '../../../workplace_search/components/shared/assets/source_icons';

import './icon_row.scss';

const icons = [
  {
    icon: 'logoElasticsearch',
    title: 'Elasticsearch',
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.elasticsearch.tooltip', {
      defaultMessage:
        'Use App and Workplace Search Search Engines with existing Elasticsearch indices',
    }),
  },
  {
    icon: 'desktop',
    title: i18n.translate('xpack.enterpriseSearch.overview.iconRow.api.title', {
      defaultMessage: 'API',
    }),
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.api.tooltip', {
      defaultMessage: 'POST documents to an API endpoint from your own applications',
    }),
  },
  {
    icon: 'globe',
    title: i18n.translate('xpack.enterpriseSearch.overview.iconRow.crawler.title', {
      defaultMessage: 'Elastic Web Crawler',
    }),
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.crawler.tooltip', {
      defaultMessage: 'Automatically index content from your websites',
    }),
  },
  {
    icon: images.confluence,
    title: i18n.translate('xpack.enterpriseSearch.overview.iconRow.confluence.title', {
      defaultMessage: 'Confluence',
    }),
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.confluence.tooltip', {
      defaultMessage: 'Index content from Atlassian Confluence',
    }),
  },
  {
    icon: images.googleDrive,
    title: i18n.translate('xpack.enterpriseSearch.overview.iconRow.googleDrive.title', {
      defaultMessage: 'Google Drive',
    }),
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.googleDrive.tooltip', {
      defaultMessage: 'Index documents from Google Drive',
    }),
  },
  {
    icon: images.sharePoint,
    title: i18n.translate('xpack.enterpriseSearch.overview.iconRow.sharePoint.title', {
      defaultMessage: 'Microsoft SharePoint',
    }),
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.sharePoint.tooltip', {
      defaultMessage: 'Index content from Microsoft SharePoint',
    }),
  },
  {
    icon: images.github,
    title: i18n.translate('xpack.enterpriseSearch.overview.iconRow.github.title', {
      defaultMessage: 'GitHub',
    }),
    tooltip: i18n.translate('xpack.enterpriseSearch.overview.iconRow.github.tooltip', {
      defaultMessage: 'Index issues, pull requests, and more from GitHub',
    }),
  },
];

export const IconRow: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          {icons.map((item, index) => {
            return (
              <EuiFlexItem grow={false} key={index}>
                <EuiToolTip
                  content={
                    <EuiText>
                      <h4 className="iconTooltip">{item.title}</h4>
                      {item.tooltip}
                    </EuiText>
                  }
                >
                  <EuiIcon className="grayscaleSvg" type={item.icon} size="m" color="text" />
                </EuiToolTip>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('xpack.enterpriseSearch.overview.iconRow.manyMoreBadge', {
            defaultMessage: 'And many more',
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
