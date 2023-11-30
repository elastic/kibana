/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormFieldset,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { type FC, useMemo, useState } from 'react';
import { groupBy } from 'lodash';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { useMlKibana } from '../contexts/kibana';
import { ModelItem } from './models_list';

export interface AddModelFlyoutProps {
  modelDownloads: ModelItem[];
  onClose: () => void;
  onSubmit: (modelId: string) => void;
}

type FlyoutTabId = 'clickToDownload' | 'manualDownload';

/**
 * Flyout for downloading elastic curated models and showing instructions for importing third-party models.
 */
export const AddModelFlyout: FC<AddModelFlyoutProps> = ({ onClose, onSubmit, modelDownloads }) => {
  const canCreateTrainedModels = usePermissionCheck('canCreateTrainedModels');
  const isClickToDownloadTabVisible = canCreateTrainedModels && modelDownloads.length > 0;

  const [selectedTabId, setSelectedTabId] = useState<FlyoutTabId>(
    isClickToDownloadTabVisible ? 'clickToDownload' : 'manualDownload'
  );

  const tabs = useMemo(() => {
    return [
      ...(isClickToDownloadTabVisible
        ? [
            {
              id: 'clickToDownload' as const,
              name: (
                <FormattedMessage
                  id="xpack.ml.trainedModels.addModelFlyout.clickToDownloadTabLabel"
                  defaultMessage="Click to Download"
                />
              ),
              content: (
                <ClickToDownloadTabContent
                  modelDownloads={modelDownloads}
                  onModelDownload={onSubmit}
                />
              ),
            },
          ]
        : []),
      {
        id: 'manualDownload' as const,
        name: (
          <FormattedMessage
            id="xpack.ml.trainedModels.addModelFlyout.thirdPartyLabel"
            defaultMessage="Manual Download"
          />
        ),
        content: <ManualDownloadTabContent />,
      },
    ];
  }, [isClickToDownloadTabVisible, modelDownloads, onSubmit]);

  const selectedTabContent = useMemo(() => {
    return tabs.find((obj) => obj.id === selectedTabId)?.content;
  }, [selectedTabId, tabs]);

  return (
    <EuiFlyout ownFocus onClose={onClose} aria-labelledby={'addTrainedModelFlyout'}>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2 id={'addTrainedModelFlyout'}>
            <FormattedMessage
              id="xpack.ml.trainedModels.addModelFlyout.title"
              defaultMessage="Add a trained model"
            />
          </h2>
        </EuiTitle>
        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={selectedTabId === tab.id}
              onClick={setSelectedTabId.bind(null, tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{selectedTabContent}</EuiFlyoutBody>
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
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

interface ClickToDownloadTabContentProps {
  modelDownloads: ModelItem[];
  onModelDownload: (modelId: string) => void;
}

/**
 * Tab content for selecting a model to download.
 */
const ClickToDownloadTabContent: FC<ClickToDownloadTabContentProps> = ({
  modelDownloads,
  onModelDownload,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(
    modelDownloads.find((m) => m.recommended)?.model_id
  );

  return (
    <>
      {Object.entries(groupBy(modelDownloads, 'modelName')).map(([modelName, models]) => {
        return (
          <React.Fragment key={modelName}>
            {modelName === 'elser' ? (
              <div>
                <EuiFlexGroup gutterSize={'s'} alignItems={'center'}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="logoElastic" size="l" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle size={'s'}>
                      <h3>
                        <FormattedMessage
                          id="xpack.ml.trainedModels.modelsList.elserTitle"
                          defaultMessage="ELSER (Elastic Learned Sparse EncodeR)"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <p>
                  <EuiText color={'subdued'} size={'s'}>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.elserDescription"
                      defaultMessage="ELSER is Elastic's NLP model for English semantic search, utilizing sparse vectors. It prioritizes intent and contextual meaning over literal term matching, optimized specifically for English documents and queries on the Elastic platform."
                    />
                  </EuiText>
                </p>
                <EuiSpacer size="s" />
                <p>
                  <EuiLink href={docLinks.links.ml.nlpElser} external target={'_blank'}>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.elserViewDocumentationLinkLabel"
                      defaultMessage="View documentation"
                    />
                  </EuiLink>
                </p>
                <EuiSpacer size={'m'} />
              </div>
            ) : null}

            {modelName === 'e5' ? (
              <div>
                <EuiTitle size={'s'}>
                  <h3>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.e5Title"
                      defaultMessage="E5 (EmbEddings from bidirEctional Encoder rEpresentations)"
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <p>
                  <EuiText color={'subdued'} size={'s'}>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.e5Description"
                      defaultMessage="E5 is an NLP model that enables you to perform multi-lingual semantic search by using dense vector representations. This model performs best for non-English language documents and queries."
                    />
                  </EuiText>
                </p>
                <EuiSpacer size="s" />
                <EuiFlexGroup justifyContent={'spaceBetween'} gutterSize={'none'}>
                  <EuiFlexItem grow={false}>
                    <EuiLink href={docLinks.links.ml.nlpE5} external target={'_blank'}>
                      <FormattedMessage
                        id="xpack.ml.trainedModels.modelsList.elserViewDocumentationLinkLabel"
                        defaultMessage="View documentation"
                      />
                    </EuiLink>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color="hollow"
                      target={'_blank'}
                      href={'https://huggingface.co/elastic/multilingual-e5-small-optimized'}
                    >
                      <FormattedMessage
                        id="xpack.ml.trainedModels.modelsList.mitLicenseLabel"
                        defaultMessage="License: MIT"
                      />
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size={'l'} />
              </div>
            ) : null}

            <EuiFormFieldset
              legend={{
                children: (
                  <FormattedMessage
                    id="xpack.ml.trainedModels.addModelFlyout.chooseModelLabel"
                    defaultMessage="Choose a model"
                  />
                ),
              }}
            >
              {models.map((model, index) => {
                return (
                  <React.Fragment key={model.model_id}>
                    <EuiCheckableCard
                      id={model.model_id}
                      label={
                        <EuiFlexGroup
                          gutterSize={'s'}
                          alignItems={'center'}
                          justifyContent={'spaceBetween'}
                        >
                          <EuiFlexItem grow={false}>
                            <header>
                              <EuiText size={'s'}>
                                <b>
                                  {model.os === 'Linux' && model.arch === 'amd64' ? (
                                    <FormattedMessage
                                      id="xpack.ml.trainedModels.addModelFlyout.intelLinuxLabel"
                                      defaultMessage="Intel and Linux optimized"
                                    />
                                  ) : (
                                    <FormattedMessage
                                      id="xpack.ml.trainedModels.addModelFlyout.crossPlatformLabel"
                                      defaultMessage="Cross platform"
                                    />
                                  )}
                                </b>
                              </EuiText>
                            </header>
                            <EuiText size={'s'} color={'subdued'}>
                              {model.model_id}
                            </EuiText>
                          </EuiFlexItem>
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
                                <EuiBadge color="hollow">
                                  <FormattedMessage
                                    id="xpack.ml.trainedModels.addModelFlyout.recommendedDownloadLabel"
                                    defaultMessage="Recommended"
                                  />
                                </EuiBadge>
                              </EuiToolTip>
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                      }
                      name={model.model_id}
                      value={model.model_id}
                      checked={model.model_id === selectedModelId}
                      onChange={setSelectedModelId.bind(null, model.model_id)}
                    />
                    {index < models.length - 1 ? <EuiSpacer size="m" /> : null}
                  </React.Fragment>
                );
              })}
            </EuiFormFieldset>
            <EuiSpacer size="xxl" />
          </React.Fragment>
        );
      })}
      <EuiButton
        onClick={onModelDownload.bind(null, selectedModelId!)}
        fill
        disabled={!selectedModelId}
      >
        <FormattedMessage
          id="xpack.ml.trainedModels.addModelFlyout.downloadButtonLabel"
          defaultMessage="Download"
        />
      </EuiButton>
    </>
  );
};

/**
 * Manual download tab content for showing instructions for importing third-party models.
 */
const ManualDownloadTabContent: FC = () => {
  const {
    services: { docLinks },
  } = useMlKibana();

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiSteps
        steps={[
          {
            title: i18n.translate('xpack.ml.trainedModels.addModelFlyout.thirdParty.step1Title', {
              defaultMessage: 'Install the Eland Python Client',
            }),
            children: (
              <EuiText>
                <p>
                  <EuiText size={'s'} color={'subdued'}>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.thirdParty.pipInstallLabel"
                      defaultMessage="Eland can be installed with {pipLink} from {pypiLink}:"
                      values={{
                        pipLink: (
                          <EuiLink
                            href={'https://pypi.org/project/pip/'}
                            target={'_blank'}
                            external
                          >
                            pip
                          </EuiLink>
                        ),
                        pypiLink: (
                          <EuiLink href={'https://pypi.org/'} target={'_blank'} external>
                            PyPI
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                </p>
                <p>
                  <EuiCodeBlock isCopyable language="shell" fontSize={'m'}>
                    $ python -m pip install eland
                  </EuiCodeBlock>
                </p>
                <p>
                  <EuiText size={'s'} color={'subdued'}>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.thirdParty.condaInstallLabel"
                      defaultMessage="or it can also be installed with {condaLink} from {condaForgeLink}:"
                      values={{
                        condaLink: (
                          <EuiLink href={'https://docs.conda.io/'} target={'_blank'} external>
                            Conda
                          </EuiLink>
                        ),
                        condaForgeLink: (
                          <EuiLink href={'https://conda-forge.org/'} target={'_blank'} external>
                            Conda Forge
                          </EuiLink>
                        ),
                      }}
                    />
                  </EuiText>
                </p>
                <p>
                  <EuiCodeBlock isCopyable language="shell" fontSize={'m'}>
                    $ conda install -c conda-forge eland
                  </EuiCodeBlock>
                </p>
              </EuiText>
            ),
          },
          {
            title: i18n.translate('xpack.ml.trainedModels.addModelFlyout.thirdParty.step2Title', {
              defaultMessage: 'Importing your third-party model',
            }),
            children: (
              <EuiText>
                <p>
                  <EuiText size={'s'} color={'subdued'}>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step2Body"
                      defaultMessage="Follow the instructions on importing compatible third-party models"
                    />
                  </EuiText>
                </p>

                <p>
                  <b>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step2ExampleTitle"
                      defaultMessage="Example import"
                    />
                  </b>

                  <EuiCodeBlock isCopyable language="shell" fontSize={'m'}>
                    eland_import_hub_model <br />
                    --cloud-id &lt;cloud-id&gt; \ <br />
                    -u &lt;username&gt; -p &lt;password&gt; \ <br />
                    --hub-model-id &lt;model-id&gt; \ <br />
                    --task-type ner \
                  </EuiCodeBlock>
                </p>

                <EuiFlexGroup gutterSize={'s'}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      href={docLinks.links.ml.nlpImportModel}
                      target={'_blank'}
                      iconType={'help'}
                    >
                      <FormattedMessage
                        id="xpack.ml.trainedModels.addModelFlyout.thirdParty.importModelButtonLabel"
                        defaultMessage="Import models with Eland"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      href={docLinks.links.enterpriseSearch.supportedNlpModels}
                      target={'_blank'}
                      iconType={'help'}
                    >
                      <FormattedMessage
                        id="xpack.ml.trainedModels.addModelFlyout.thirdParty.compatibleModelsButtonLabel"
                        defaultMessage="Compatible NLP models"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiText>
            ),
          },
          {
            title: i18n.translate('xpack.ml.trainedModels.addModelFlyout.thirdParty.step4Title', {
              defaultMessage: 'Deploy your model',
            }),
            children: (
              <>
                <EuiText size={'s'} color={'subdued'}>
                  <p>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step4Body"
                      defaultMessage="Click “Start deployment” in the table row containing your new model to deploy and use it."
                    />
                  </p>
                </EuiText>
                <EuiSpacer size={'m'} />
                <EuiText size={'s'} color={'subdued'}>
                  <p>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.addModelFlyout.thirdParty.step3Body"
                      defaultMessage="Note: The trained model list automatically refreshes with the most current imported models in your cluster. If the list is not updated, click the 'Refresh' button in the top right corner. Otherwise, revisit the instructions above to troubleshoot."
                    />
                  </p>
                </EuiText>
              </>
            ),
          },
        ]}
      />
    </>
  );
};
