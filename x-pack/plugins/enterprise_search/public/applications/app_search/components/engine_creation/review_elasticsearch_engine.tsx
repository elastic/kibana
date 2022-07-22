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
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiI18n,
  EuiPanel,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';
import { IndexStatusDetails } from './search_index_selectable';

export const ReviewElasticsearchEngine: React.FC = () => {
  const { aliasName, name, selectedIndex, selectedIndexFormatted } = useValues(EngineCreationLogic);
  const { setCreationStep, submitEngine } = useActions(EngineCreationLogic);

  return (
    <div className="entSearch__createEngineLayout">
      <EuiStepsHorizontal
        steps={[
          {
            onClick: () => setCreationStep(EngineCreationSteps.SelectStep),
            status: 'complete',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.searchEngineType.label',
              {
                defaultMessage: 'Search engine type',
              }
            ),
          },
          {
            onClick: () => setCreationStep(EngineCreationSteps.ConfigureStep),
            status: 'complete',
            title: i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.steps.configuration.label',
              {
                defaultMessage: 'Configuration',
              }
            ),
          },
          {
            onClick: () => {},
            status: 'current',
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

      <EuiPanel hasBorder>
        <EuiForm
          component="form"
          data-test-subj="ElasticsearchEngineCreationForm"
          onSubmit={(e) => {
            e.preventDefault();
            submitEngine();
          }}
        >
          <EuiTextAlign textAlign="center">
            <EuiTitle>
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.title.label',
                  {
                    defaultMessage: 'Review your search engine',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiTextAlign>

          <EuiSpacer />

          <EuiText color="subdued" textAlign="center">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.description',
              {
                defaultMessage:
                  'Your App Search engine will be created with the following configuration.',
              }
            )}
          </EuiText>

          <EuiSpacer />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.engineType.title',
                      {
                        defaultMessage: 'Engine Type',
                      }
                    )}
                  </h4>
                </EuiText>
                <EuiText>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.engineType.description',
                    {
                      defaultMessage: 'Elasticsearch index-based',
                    }
                  )}
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.aliasName.title',
                      {
                        defaultMessage: 'Alias Name',
                      }
                    )}
                  </h4>
                </EuiText>
                <EuiText>{aliasName || '--'}</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.engineName.title',
                      {
                        defaultMessage: 'Engine Name',
                      }
                    )}
                  </h4>
                </EuiText>
                <EuiText>{name}</EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engineCreation.reviewForm.elasticsearchIndex.title',
                      {
                        defaultMessage: 'Elasticsearch Index',
                      }
                    )}
                  </h4>
                </EuiText>
                <EuiText>{selectedIndex}</EuiText>

                <EuiSpacer size="s" />

                <IndexStatusDetails option={selectedIndexFormatted} />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {aliasName.length > 0 && (
            <EuiCallOut
              data-test-subj="ElasticsearchEngineCreationFormAliasNameCallout"
              size="m"
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureElasticsearchEngine.callout.title',
                {
                  defaultMessage: 'An alias will be created and used for this engine',
                }
              )}
              iconType="iInCircle"
            >
              <EuiI18n
                token="xpack.enterpriseSearch.appSearch.engineCreation.configureElasticsearchEngine.callout.body"
                default={`Enterprise Search will create an alias for you named
                  {aliasName} and use it as the source of the engine, {name}.`}
                values={{
                  aliasName: <b>{aliasName}</b>,
                  name: <b>{name}</b>,
                }}
              />
            </EuiCallOut>
          )}

          <EuiSpacer />

          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="NewEngineBackButton"
                color="primary"
                iconType="arrowLeft"
                onClick={() => {
                  setCreationStep(EngineCreationSteps.ConfigureStep);
                }}
              >
                {i18n.translate(
                  // FIXME: this and the rest of the paths
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.editConfiguration.label',
                  {
                    defaultMessage: 'Edit configuration',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                data-test-subj="NewEngineSubmitButton"
                iconType="arrowRight"
                iconSide="right"
                fill
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.continue.label',
                  {
                    defaultMessage: 'Create search engine',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiPanel>
    </div>
  );
};
