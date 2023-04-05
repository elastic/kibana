/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';

export const SelectEngineType: React.FC = () => {
  const { engineType } = useValues(EngineCreationLogic);
  const { setEngineType, setCreationStep } = useActions(EngineCreationLogic);

  return (
    <div className="entSearch__createEngineLayout">
      <EuiStepsHorizontal
        steps={[
          {
            onClick: () => {},
            status: 'current',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.searchEngineType.label',
              {
                defaultMessage: 'Search engine type',
              }
            ),
          },
          {
            onClick: () => setCreationStep(EngineCreationSteps.ConfigureStep),
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.configuration.label',
              {
                defaultMessage: 'Configuration',
              }
            ),
          },
          {
            onClick: () => {},
            status: 'disabled',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.review.label',
              {
                defaultMessage: 'Review',
              }
            ),
          },
        ]}
      />

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="l">
        <EuiTextAlign textAlign="center">
          <EuiTitle>
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngineTypeForm.title',
                {
                  defaultMessage: 'Select a search engine type',
                }
              )}
            </h2>
          </EuiTitle>
        </EuiTextAlign>

        <EuiSpacer />

        <EuiText color="subdued" textAlign="center">
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engineCreation.selectEngineTypeForm.description',
            {
              defaultMessage: `
                You can now create search engines that use an existing
                Elasticsearch index to combine the search management tools of App
                Search with the flexibility of Elasticsearch indices.
              `,
            }
          )}
          <EuiLink
            href="https://www.elastic.co/guide/en/app-search/current/elasticsearch-engines.html"
            external
          >
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.selectEngineTypeForm.description.link',
              {
                defaultMessage: 'Learn more',
              }
            )}
          </EuiLink>
        </EuiText>

        <EuiSpacer />
        <EuiSpacer />

        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiCard
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.appSearch.title',
                {
                  defaultMessage: 'App Search managed docs',
                }
              )}
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.appSearch.description',
                {
                  defaultMessage: `
                    Use App Search APIs to manage your documents. App Search will write your documents into an underlying index and manage it for you.
                  `,
                }
              )}
              selectable={{
                isSelected: engineType === 'appSearch',
                onClick: () => setEngineType('appSearch'),
              }}
              data-test-subj="AppSearchEngineSelectable"
              hasBorder
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.elasticsearch.title',
                {
                  defaultMessage: 'Elasticsearch index-based',
                }
              )}
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.elasticsearch.description',
                {
                  defaultMessage: `
                    Use an existing index to manage your documents.
                    Adds search with App Search to Elasticsearch indices.
                    Some functions require specific subfields.
                  `,
                }
              )}
              selectable={{
                isSelected: engineType === 'elasticsearch',
                onClick: () => setEngineType('elasticsearch'),
              }}
              data-test-subj="ElasticsearchEngineSelectable"
              hasBorder
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="arrowRight"
              iconSide="right"
              onClick={() => {
                setCreationStep(EngineCreationSteps.ConfigureStep);
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.nextStep.buttonLabel',
                {
                  defaultMessage: 'Continue',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
