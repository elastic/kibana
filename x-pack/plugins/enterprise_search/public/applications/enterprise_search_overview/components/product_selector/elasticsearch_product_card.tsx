/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { ELASTICSEARCH_PLUGIN } from '../../../../../common/constants';
import { docLinks } from '../../../shared/doc_links';
import { ProductCard } from '../product_card';

export const ElasticsearchProductCard = () => {
  return (
    <ProductCard
      data-test-subj="productCard-elasticsearch"
      description={i18n.translate('xpack.enterpriseSearch.elasticsearch.productCardDescription', {
        defaultMessage:
          'Ideal for bespoke applications, Elasticsearch helps you build highly customizable search and offers many different ingestion methods.',
      })}
      features={[
        i18n.translate('xpack.enterpriseSearch.elasticsearch.features.integrate', {
          defaultMessage: 'Integrate with databases, websites, and more',
        }),
        i18n.translate('xpack.enterpriseSearch.elasticsearch.features.buildTooling', {
          defaultMessage: 'Build custom tooling',
        }),
        i18n.translate('xpack.enterpriseSearch.elasticsearch.features.buildSearchExperiences', {
          defaultMessage: 'Build custom search experiences',
        }),
        i18n.translate('xpack.enterpriseSearch.elasticsearch.features.esre', {
          defaultMessage: 'The Elasticsearch Relevance Engine™ (ESRE)',
        }),
      ]}
      icon="logoElasticsearch"
      name={ELASTICSEARCH_PLUGIN.NAME}
      productId={ELASTICSEARCH_PLUGIN.ID}
      resourceLinks={[
        {
          label: i18n.translate(
            'xpack.enterpriseSearch.elasticsearch.resources.gettingStartedLabel',
            {
              defaultMessage: 'Getting started with Elasticsearch',
            }
          ),
          to: docLinks.start,
        },
        {
          label: i18n.translate(
            'xpack.enterpriseSearch.elasticsearch.resources.createNewIndexLabel',
            {
              defaultMessage: 'Create a new index',
            }
          ),
          to: docLinks.start,
        },
        {
          label: i18n.translate(
            'xpack.enterpriseSearch.elasticsearch.resources.languageClientLabel',
            {
              defaultMessage: 'Set up a language client',
            }
          ),
          to: docLinks.languageClients,
        },
        {
          label: i18n.translate('xpack.enterpriseSearch.elasticsearch.resources.searchUILabel', {
            defaultMessage: 'Search UI for Elasticsearch',
          }),
          to: docLinks.searchUIElasticsearch,
        },
        {
          label: i18n.translate('xpack.enterpriseSearch.elasticsearch.resources.elserLabel', {
            defaultMessage: 'ELSER text expansion',
          }),
          to: docLinks.elser,
        },
      ]}
    />
  );
};
