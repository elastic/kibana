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
  EuiPanel,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextAlign,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EngineCreationLogic, EngineCreationSteps } from './engine_creation_logic';

export const ReviewElasticsearchEngine: React.FC = () => {
  const { aliasName, engineType, name, selectedIndex } = useValues(EngineCreationLogic);
  const { setCreationStep, submitEngine } = useActions(EngineCreationLogic);

  return (
    <>
      <EuiStepsHorizontal
        steps={[
          {
            title: 'Search engine type',
            status: 'complete',
            onClick: () => {
              setCreationStep(EngineCreationSteps.SelectStep);
            },
          },
          {
            title: 'Configuration',
            status: 'complete',
            onClick: () => {
              setCreationStep(EngineCreationSteps.ConfigureStep);
            },
          },
          {
            title: 'Review',
            status: 'current',
            onClick: () => {},
          },
        ]}
      />
      <EuiPanel hasBorder>
        <EuiForm
          component="form"
          data-test-subj="EngineCreationForm"
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
              'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.description',
              {
                defaultMessage:
                  'placeholder text, please fix me, the mocks had something from a different slide',
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
                      'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.description',
                      {
                        defaultMessage: 'Engine Type',
                      }
                    )}
                  </h4>
                </EuiText>
                <EuiText>{engineType}</EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" hasShadow={false}>
                <EuiText>
                  <h4>
                    {i18n.translate(
                      'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.description',
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
                      'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.description',
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
                      'xpack.enterpriseSearch.appSearch.engineCreation.configureForm.description',
                      {
                        defaultMessage: 'Elasticsearch Index',
                      }
                    )}
                  </h4>
                </EuiText>
                <EuiText>{selectedIndex}</EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer />

          {aliasName.length > 0 && (
            <EuiCallOut
              size="m"
              title={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engineCreation.configureElasticsearchEngine.callout.title',
                { defaultMessage: 'An alias will be created for this index' }
              )}
              iconType="iInCircle"
            >
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engineCreation.configureElasticsearchEngine.callout.body',
                  {
                    defaultMessage: `
                      The index you’ve selected has a name that does not match
                      the Enterprise Search naming pattern of "search-." We will
                      automatically create an alias for you named ${aliasName}
                      and assign it to the engine, ${name}.
                    `,
                  }
                )}
              </p>
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
                  'xpack.enterpriseSearch.appSearch.engineCreation.form.backButton.label',
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
    </>
  );
};
