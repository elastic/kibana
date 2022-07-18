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
            onClick: () => {
              setCreationStep(EngineCreationSteps.ConfigureStep);
            },
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
                Search with the flexibility of Elasticsearch indices. Learn more.
              `,
            }
          )}
        </EuiText>

        <EuiSpacer />
        <EuiSpacer />

        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiCard
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.appSearch.title',
                {
                  defaultMessage: 'Manage documents with App Search',
                }
              )}
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.appSearch.description',
                {
                  defaultMessage: `
                    Use App Search APIs to manage documents. App Search will manage your documents and underlying index for you. 
                  `,
                }
              )}
              selectable={{
                isSelected: engineType === 'appSearch',
                onClick: () => {
                  setEngineType('appSearch');
                },
              }}
              hasBorder
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCard
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.elasticsearch.title',
                {
                  defaultMessage: 'Elasticsearch index-based engine',
                }
              )}
              description={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.selectEngine.elasticsearch.description',
                {
                  defaultMessage: `
                    Use an existing index to manage your documents. 
                    Adds search with App Search to Elasticsearch indices.
                    Some functions require specific subfields. Learn more.
                  `,
                }
              )}
              betaBadgeProps={{
                label: 'Beta',
                tooltipContent: 'This module is not GA. Please help us by reporting any bugs.',
              }}
              selectable={{
                isSelected: engineType === 'elasticsearch',
                onClick: () => {
                  setEngineType('elasticsearch');
                },
              }}
              hasBorder
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />

        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
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
