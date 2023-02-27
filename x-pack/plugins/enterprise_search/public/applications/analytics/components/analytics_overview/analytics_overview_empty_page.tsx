/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiImage, EuiLink, EuiTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import noMlModelsGraphicDark from '../../../../assets/images/no_ml_models_dark.svg';

import { docLinks } from '../../../shared/doc_links';
import { AddAnalyticsCollection } from '../add_analytics_collections/add_analytics_collection';

const ICON_WIDTH = 294;

export const AnalyticsOverviewEmptyPage: React.FC = () => (
  <EuiEmptyPrompt
    icon={<EuiImage size={ICON_WIDTH} src={noMlModelsGraphicDark} alt="icon" />}
    layout="horizontal"
    color="plain"
    title={
      <h2>
        {i18n.translate('xpack.enterpriseSearch.analytics.collections.emptyState.headingTitle', {
          defaultMessage: 'Create your first Collection',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.enterpriseSearch.analytics.collections.emptyState.subHeading', {
          defaultMessage:
            'Collections are required to store analytics events for your search application.',
        })}
      </p>
    }
    actions={[<AddAnalyticsCollection />]}
    footer={
      <>
        <EuiTitle size="xxs">
          <span>
            {i18n.translate('xpack.enterpriseSearch.analytics.collections.emptyState.footerText', {
              defaultMessage: 'Want to learn more?',
            })}
          </span>
        </EuiTitle>{' '}
        <EuiLink href={docLinks.behavioralAnalytics} target="_blank" external>
          {i18n.translate('xpack.enterpriseSearch.analytics.collections.emptyState.footerLink', {
            defaultMessage: 'Read documentation',
          })}
        </EuiLink>
      </>
    }
  />
);
