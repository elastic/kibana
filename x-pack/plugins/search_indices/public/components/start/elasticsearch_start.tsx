/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { IndicesStatusResponse, UserStartPrivilegesResponse } from '../../../common';
import { docLinks } from '../../../common/doc_links';

import { AnalyticsEvents } from '../../analytics/constants';
import { AvailableLanguages } from '../../code_examples';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { generateRandomIndexName } from '../../utils/indices';
import { getDefaultCodingLanguage } from '../../utils/language';

import { CreateIndexForm } from './create_index';
import { CreateIndexCodeView } from './create_index_code';
import { CreateIndexFormState } from './types';
import { useKibana } from '../../hooks/use_kibana';

function initCreateIndexState(): CreateIndexFormState {
  return {
    indexName: generateRandomIndexName(),
    codingLanguage: getDefaultCodingLanguage(),
  };
}

const MAX_WIDTH = '650px';

enum CreateIndexView {
  UI = 'ui',
  Code = 'code',
}
export interface ElasticsearchStartProps {
  indicesData?: IndicesStatusResponse;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const ElasticsearchStart = ({ userPrivileges }: ElasticsearchStartProps) => {
  const { cloud, http } = useKibana().services;
  const [createIndexView, setCreateIndexView] = useState<CreateIndexView>(
    userPrivileges?.privileges.canCreateIndex === false ? CreateIndexView.Code : CreateIndexView.UI
  );
  const [formState, setFormState] = useState<CreateIndexFormState>(initCreateIndexState);
  const usageTracker = useUsageTracker();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.startPageOpened);
  }, [usageTracker]);
  useEffect(() => {
    if (userPrivileges === undefined) return;
    if (userPrivileges.privileges.canCreateIndex === false) {
      setCreateIndexView(CreateIndexView.Code);
    }
  }, [userPrivileges]);

  const o11yTrialLink = useMemo(() => {
    if (cloud && cloud.isServerlessEnabled) {
      const baseUrl = cloud?.projectsUrl ?? 'https://cloud.elastic.co/projects/';
      return `${baseUrl}create/observability/start`;
    }
    return http.basePath.prepend('/app/observability/onboarding');
  }, [cloud, http]);

  const onChangeView = useCallback(
    (id: string) => {
      switch (id) {
        case CreateIndexView.UI:
          usageTracker.click(AnalyticsEvents.startPageShowCreateIndexUIClick);
          setCreateIndexView(CreateIndexView.UI);
          return;
        case CreateIndexView.Code:
          usageTracker.click(AnalyticsEvents.startPageShowCodeClick);
          setCreateIndexView(CreateIndexView.Code);
          return;
      }
    },
    [usageTracker]
  );
  const onChangeCodingLanguage = useCallback(
    (language: AvailableLanguages) => {
      setFormState({
        ...formState,
        codingLanguage: language,
      });
    },
    [formState, setFormState]
  );

  return (
    <EuiPanel
      color="subdued"
      hasShadow={false}
      hasBorder
      paddingSize="l"
      style={{ maxWidth: MAX_WIDTH, margin: '0 auto' }}
    >
      <EuiPanel color="transparent" paddingSize="m">
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElasticsearch" size="xl" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h1>
                {i18n.translate('xpack.searchIndices.startPage.pageTitle', {
                  defaultMessage: 'Elasticsearch',
                })}
              </h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h2>
            {i18n.translate('xpack.searchIndices.startPage.pageDescription', {
              defaultMessage: 'Vectorize, search, and visualize your data',
            })}
          </h2>
        </EuiTitle>
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  {i18n.translate('xpack.searchIndices.startPage.createIndex.title', {
                    defaultMessage: 'Create your first index',
                  })}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.searchIndices.startPage.createIndex.viewSelec.legend',
                  { defaultMessage: 'Create index view selection' }
                )}
                options={[
                  {
                    id: CreateIndexView.UI,
                    label: i18n.translate(
                      'xpack.searchIndices.startPage.createIndex.viewSelect.ui',
                      { defaultMessage: 'UI' }
                    ),
                    'data-test-subj': 'createIndexUIViewBtn',
                  },
                  {
                    id: CreateIndexView.Code,
                    label: i18n.translate(
                      'xpack.searchIndices.startPage.createIndex.viewSelect.code',
                      { defaultMessage: 'Code' }
                    ),
                    'data-test-subj': 'createIndexCodeViewBtn',
                  },
                ]}
                buttonSize="compressed"
                idSelected={createIndexView}
                onChange={onChangeView}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiText color="subdued">
            <p>
              {i18n.translate('xpack.searchIndices.startPage.createIndex.description', {
                defaultMessage:
                  'An index stores your data and defines the schema, or field mappings, for your searches',
              })}
            </p>
          </EuiText>
          {createIndexView === CreateIndexView.UI && (
            <CreateIndexForm
              userPrivileges={userPrivileges}
              formState={formState}
              setFormState={setFormState}
            />
          )}
          {createIndexView === CreateIndexView.Code && (
            <CreateIndexCodeView
              createIndexForm={formState}
              changeCodingLanguage={onChangeCodingLanguage}
              canCreateApiKey={userPrivileges?.privileges.canCreateApiKeys}
            />
          )}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel color="transparent">
        <EuiTextAlign textAlign="center">
          <EuiTitle size="xs">
            <h5>
              {i18n.translate('xpack.searchIndices.startPage.observabilityCallout.title', {
                defaultMessage: 'Looking to store your logs or metrics data?',
              })}
            </h5>
          </EuiTitle>
        </EuiTextAlign>
        <EuiSpacer size="m" />
        <EuiFlexGroup alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="text"
              iconSide="right"
              iconType="popout"
              data-test-subj="analyzeLogsBtn"
              data-telemetry-id="searchIndicesStartCollectLogsLink"
              href={docLinks.analyzeLogs}
              target="_blank"
            >
              {i18n.translate('xpack.searchIndices.startPage.observabilityCallout.logs.button', {
                defaultMessage: 'Collect and analyze logs',
              })}
            </EuiButtonEmpty>
            <EuiText color="subdued" size="s" textAlign="center">
              <small>
                {i18n.translate(
                  'xpack.searchIndices.startPage.observabilityCallout.logs.subTitle',
                  {
                    defaultMessage: 'Explore Logstash and Beats',
                  }
                )}
              </small>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText>or</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="text"
              iconSide="right"
              iconType="popout"
              data-test-subj="startO11yTrialBtn"
              data-telemetry-id="searchIndicesStartO11yTrialLink"
              href={o11yTrialLink}
              target="_blank"
            >
              {i18n.translate(
                'xpack.searchIndices.startPage.observabilityCallout.o11yTrial.button',
                {
                  defaultMessage: 'Start an Observability trial',
                }
              )}
            </EuiButtonEmpty>
            <EuiText color="subdued" size="s" textAlign="center">
              <small>
                {i18n.translate(
                  'xpack.searchIndices.startPage.observabilityCallout.o11yTrial.subTitle',
                  {
                    defaultMessage: 'Powerful performance monitoring',
                  }
                )}
              </small>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
