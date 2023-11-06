/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import React, { type FC, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ModelItem } from './models_list';

export interface AddModelFlyoutProps {
  modelDownloads: ModelItem[];
  onClose: () => void;
  onSumbit: (modelId: string) => void;
}

export const AddModelFlyout: FC<AddModelFlyoutProps> = ({ onClose, onSumbit, modelDownloads }) => {
  const [selectedTabId, setSelectedTabId] = useState('elser');
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    modelDownloads.find((m) => m.recommended)?.model_id
  );

  const tabs = useMemo(() => {
    return [
      {
        id: 'elser',
        name: (
          <FormattedMessage
            id="xpack.ml.trainedModels.addModelFlyout.elserTabLabel"
            defaultMessage="ELSER"
          />
        ),
        content: (
          <>
            <EuiRadioGroup
              options={modelDownloads.map((model) => {
                return {
                  id: model.model_id,
                  label: (
                    <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="logoElastic" size="l" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>{model.model_id}</EuiFlexItem>
                      {model.recommended ? (
                        <EuiFlexItem grow={false}>
                          <EuiToolTip
                            content={
                              <FormattedMessage
                                id="xpack.ml.trainedModels.modelsList.recommendedDownloadContent"
                                defaultMessage="Recommended ELSER model version for your cluster's hardware configuration"
                              />
                            }
                          >
                            <FormattedMessage
                              id="xpack.ml.trainedModels.modelsList.recommendedDownloadLabel"
                              defaultMessage="(Recommended)"
                            />
                          </EuiToolTip>
                        </EuiFlexItem>
                      ) : null}
                    </EuiFlexGroup>
                  ),
                };
              })}
              idSelected={selectedModelId}
              onChange={setSelectedModelId}
              name="modelSelector"
              legend={{
                children: (
                  <span>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.chooseModelLabel"
                      defaultMessage="Choose a model"
                    />
                  </span>
                ),
              }}
            />
          </>
        ),
      },
      {
        id: 'thirdParty',
        name: (
          <FormattedMessage
            id="xpack.ml.trainedModels.addModelFlyout.thirdPartyLabel"
            defaultMessage="Third-party"
          />
        ),
        content: (
          <>
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.ml.trainedModels.addModelFlyout.thirdParty.calloutTitle"
                  defaultMessage="Requires our Eland Python client"
                />
              }
              iconType="iInCircle"
            >
              <p>
                <FormattedMessage
                  id="xpack.ml.trainedModels.addModelFlyout.thirdParty.calloutBody"
                  defaultMessage="To import a third-party model directly to your Elasticsearch cluster, you will need to
              use API calls in our python client, Eland."
                />
              </p>
              <p>
                <EuiButton href={''} color={'primary'} fill={false} target={'_blank'}>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.addModelFlyout.thirdParty.elandDocumentationButtonLabel"
                    defaultMessage="Eland documentation"
                  />
                </EuiButton>
              </p>
            </EuiCallOut>
            <EuiSpacer size={'m'} />
            <EuiSteps
              steps={[
                {
                  title: i18n.translate(
                    'xpack.ml.trainedModels.addModelFlyout.thirdParty.step1Title',
                    {
                      defaultMessage: 'Install the Eland Python Client',
                    }
                  ),
                  children: (
                    <EuiText>
                      <p>Eland can be installed with pip from PyPI:</p>
                      <p>
                        <EuiCodeBlock isCopyable language="">
                          $ python -m pip install eland
                        </EuiCodeBlock>
                      </p>
                    </EuiText>
                  ),
                },
                {
                  title: i18n.translate(
                    'xpack.ml.trainedModels.addModelFlyout.thirdParty.step2Title',
                    {
                      defaultMessage:
                        'Follow the Eland instructions on importing third-party models',
                    }
                  ),
                  children: (
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step2Body"
                          defaultMessage="The latest details on supported model types and the steps needed to import models can be found in our extensive Eland documentation."
                        />
                      </p>
                      <p>
                        <EuiButton href={''} color={'primary'} fill={false} target={'_blank'}>
                          <FormattedMessage
                            id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step2ButtonLabel"
                            defaultMessage="Import models with Eland"
                          />
                        </EuiButton>
                      </p>
                    </EuiText>
                  ),
                },
                {
                  title: i18n.translate(
                    'xpack.ml.trainedModels.addModelFlyout.thirdParty.step3Title',
                    {
                      defaultMessage:
                        'Wait for your imported model to appear in the trained model list',
                    }
                  ),
                  children: (
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step3Body"
                          defaultMessage="The trained model list automatically refreshes with the most current imported models in your cluster. If it's not shown, try clicking the 'Refresh' button in the top right corner. Otherwise, revisit the instructions above to troubleshoot."
                        />
                      </p>
                    </EuiText>
                  ),
                },
                {
                  title: i18n.translate(
                    'xpack.ml.trainedModels.addModelFlyout.thirdParty.step4Title',
                    {
                      defaultMessage: 'Deploy your model',
                    }
                  ),
                  children: (
                    <EuiText>
                      <p>
                        <FormattedMessage
                          id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step4Body"
                          defaultMessage="Press the play button or click “Start deployment” in the drop menu in the table row containing your new model to deploy and use it."
                        />
                      </p>
                    </EuiText>
                  ),
                },
              ]}
            />
          </>
        ),
      },
    ];
  }, [modelDownloads, selectedModelId]);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={'addTrainedModelFlytout'}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={'addTrainedModelFlytout'}>
            <FormattedMessage
              id="xpack.ml.trainedModels.addModelFlyout.title"
              defaultMessage="Add a trained model"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              isSelected={selectedTabId === tab.id}
              onClick={setSelectedTabId.bind(null, tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
        <EuiSpacer size={'m'} />
        {selectedTabContent}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.trainedModels.addModelFlyout.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onSumbit.bind(null, selectedModelId!)}
              fill
              disabled={!selectedModelId}
            >
              <FormattedMessage
                id="xpack.ml.trainedModels.addModelFlyout.downloadButtonLabel"
                defaultMessage="Download"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
