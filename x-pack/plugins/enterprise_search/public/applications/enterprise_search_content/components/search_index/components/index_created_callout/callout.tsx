/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiButton,
  EuiLink,
  EuiText,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexCreatedCalloutLogic } from './callout_logic';

interface IndexCreatedCalloutProps {
  indexName: string;
}

export const IndexCreatedCallout: React.FC<IndexCreatedCalloutProps> = ({ indexName }) => {
  const { dismissIndexCreatedCallout } = useActions(IndexCreatedCalloutLogic);
  return (
    <EuiCallOut
      color="success"
      iconType="check"
      title={i18n.translate('xpack.enterpriseSearch.content.index.indexCreatedCallout.title', {
        defaultMessage: 'Elasticsearch index created successfully',
      })}
    >
      <EuiText size="m">
        {i18n.translate('xpack.enterpriseSearch.content.index.indexCreatedCallout.info', {
          defaultMessage:
            'You can use App Search engines to build a search experience for your new Elasticsearch index.',
        })}
        <EuiLink external href={/* TODO */ '#'}>
          {i18n.translate('xpack.enterpriseSearch.content.index.readDocumentation.link', {
            defaultMessage: 'Read the documentation',
          })}
        </EuiLink>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="success"
            onClick={() => {
              // TODO bind it to AppSearch
              // eslint-disable-next-line no-console
              console.log(indexName);
            }}
          >
            {i18n.translate('xpack.enterpriseSearch.content.index.createAppSearchEngine.button', {
              defaultMessage: 'Create an App Search engine',
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton color="success" iconType="cross" onClick={dismissIndexCreatedCallout}>
            {i18n.translate('xpack.enterpriseSearch.content.index.dismiss.button', {
              defaultMessage: 'Dismiss',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
