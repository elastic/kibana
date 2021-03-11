/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiDescribedFormGroup,
  EuiTitle,
  EuiFormRow,
  EuiSwitch,
  EuiLink,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiComboBoxOptionOption,
  EuiSpacer,
  EuiAccordion,
  EuiImage,
  EuiText,
  EuiCallOut,
} from '@elastic/eui';

import { SNIFF_MODE } from '../../../../../common/constants';
import { useAppContext } from '../../../app_context';

import {
  proxySettingsUrl,
  transportPortUrl,
  cloudRemoteClustersUrl,
} from '../../../services/documentation';

import { validateSeed, ClusterErrors } from './validators';
import { FormFields } from './remote_cluster_form';

const description = (
  <FormattedMessage
    id="xpack.remoteClusters.remoteClusterForm.sectionModeDescription"
    defaultMessage="Use seed nodes by default, or switch to proxy mode."
  />
);
const descriptionOnCloud = (
  <FormattedMessage
    id="xpack.remoteClusters.remoteClusterForm.sectionModeCloudDescription"
    defaultMessage="Copy and paste the Elasticsearch endpoint URL of the remote deployment to
  automatically configure the remote cluster or enter proxy address and server name manually."
  />
);

interface Props {
  fields: FormFields;
  onFieldsChange: (fields: Partial<FormFields>) => void;
  fieldsErrors: ClusterErrors;
  areErrorsVisible: boolean;
}

export const ConnectionMode: FunctionComponent<Props> = ({
  fields,
  fieldsErrors,
  onFieldsChange,
  areErrorsVisible,
}) => {
  const {
    mode,
    seeds = [],
    proxyAddress,
    serverName,
    nodeConnections,
    proxySocketConnections,
    isCloudUrl,
    cloudUrl,
  } = fields;
  const {
    proxyAddress: proxyAddressError,
    serverName: serverNameError,
    cloudUrl: cloudUrlError,
    seeds: seedsError,
  } = fieldsErrors;
  const { isCloudEnabled, basePath } = useAppContext();

  const [localSeedErrors, setLocalSeedErrors] = useState<JSX.Element[]>([]);

  const onCreateSeed = (newSeed?: string) => {
    // If the user just hit enter without typing anything, treat it as a no-op.
    if (!newSeed) {
      return;
    }

    const validationErrors = validateSeed(newSeed);

    if (validationErrors.length !== 0) {
      setLocalSeedErrors(validationErrors);
      // Return false to explicitly reject the user's input.
      return false;
    }

    const newSeeds = seeds.slice(0);
    newSeeds.push(newSeed.toLowerCase());
    onFieldsChange({ seeds: newSeeds });
  };

  const onSeedsInputChange = (seedInput?: string) => {
    if (!seedInput) {
      // If empty seedInput ("") don't do anything. This happens
      // right after a seed is created.
      return;
    }

    // Allow typing to clear the errors, but not to add new ones.
    const errors = !seedInput || validateSeed(seedInput).length === 0 ? [] : localSeedErrors;

    // EuiComboBox internally checks for duplicates and prevents calling onCreateOption if the
    // input is a duplicate. So we need to surface this error here instead.
    const isDuplicate = seeds.includes(seedInput);

    if (isDuplicate) {
      errors.push(
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.localSeedError.duplicateMessage"
          defaultMessage="Duplicate seed nodes aren't allowed.`"
        />
      );
    }

    setLocalSeedErrors(errors);
  };

  const renderSniffModeSettings = () => {
    // Show errors if there is a general form error or local errors.
    const areFormErrorsVisible = Boolean(areErrorsVisible && seedsError);
    const showErrors = areFormErrorsVisible || localSeedErrors.length !== 0;
    const errors =
      areFormErrorsVisible && seedsError ? localSeedErrors.concat(seedsError) : localSeedErrors;
    const formattedSeeds: EuiComboBoxOptionOption[] = seeds.map((seed) => ({ label: seed }));

    return (
      <>
        <EuiFormRow
          data-test-subj="remoteClusterFormSeedNodesFormRow"
          label={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldSeedsLabel"
              defaultMessage="Seed nodes"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldSeedsHelpText"
              defaultMessage="An IP address or host name, followed by the {transportPort} of the remote cluster. Specify multiple seed nodes so discovery doesn't fail if a node is unavailable."
              values={{
                transportPort: (
                  <EuiLink href={transportPortUrl} target="_blank">
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.sectionSeedsHelpText.transportPortLinkText"
                      defaultMessage="transport port"
                    />
                  </EuiLink>
                ),
              }}
            />
          }
          isInvalid={showErrors}
          error={errors}
          fullWidth
        >
          <EuiComboBox
            noSuggestions
            placeholder={i18n.translate(
              'xpack.remoteClusters.remoteClusterForm.fieldSeedsPlaceholder',
              {
                defaultMessage: 'host:port',
              }
            )}
            selectedOptions={formattedSeeds}
            onCreateOption={onCreateSeed}
            onChange={(options: EuiComboBoxOptionOption[]) =>
              onFieldsChange({ seeds: options.map(({ label }) => label) })
            }
            onSearchChange={onSeedsInputChange}
            isInvalid={showErrors}
            fullWidth
            data-test-subj="remoteClusterFormSeedsInput"
          />
        </EuiFormRow>

        <EuiFormRow
          data-test-subj="remoteClusterFormNodeConnectionsFormRow"
          label={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldNodeConnectionsLabel"
              defaultMessage="Node connections"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldNodeConnectionsHelpText"
              defaultMessage="The number of gateway nodes to connect to for this cluster."
            />
          }
          fullWidth
        >
          <EuiFieldNumber
            value={nodeConnections || ''}
            onChange={(e) => onFieldsChange({ nodeConnections: Number(e.target.value) })}
            fullWidth
          />
        </EuiFormRow>
      </>
    );
  };

  const renderProxyModeSettings = () => {
    return (
      <>
        {isCloudUrl ? (
          <EuiFormRow
            data-test-subj="remoteClusterFormCloudUrlFormRow"
            label={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.fieldCloudUrlLabel"
                defaultMessage="Cloud deployment url"
              />
            }
            isInvalid={Boolean(areErrorsVisible && cloudUrlError)}
            error={cloudUrlError}
            fullWidth
            helpText={
              <>
                <EuiSpacer size="s" />
                <EuiAccordion
                  id="cloudScreenshot"
                  buttonContent={
                    <EuiText size="xs">
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.fieldCloudUrlHelpText"
                        defaultMessage=" Where to find your Cloud endpoint url?"
                      />
                    </EuiText>
                  }
                >
                  <EuiSpacer size="s" />
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.cloudScreenshotDescription"
                      defaultMessage="You can copy the endpoint url from your Cloud deployment page under Applications."
                    />
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiImage
                    url={basePath.prepend('/plugins/remoteClusters/assets/cloud_screenshot.png')}
                    alt={i18n.translate(
                      'xpack.remoteClusters.remoteClusterForm.cloudScreenshotAlt',
                      {
                        defaultMessage:
                          'A screenshot of Cloud deployment page section with a highlighted endpoint url.',
                      }
                    )}
                  />
                </EuiAccordion>
              </>
            }
          >
            <EuiFieldText
              value={cloudUrl}
              placeholder={i18n.translate(
                'xpack.remoteClusters.remoteClusterForm.fieldCloudUrlPlaceholder',
                {
                  defaultMessage: 'https://host:port',
                }
              )}
              onChange={(e) => onFieldsChange({ cloudUrl: e.target.value })}
              isInvalid={Boolean(areErrorsVisible && cloudUrlError)}
              data-test-subj="remoteClusterFormCloudUrlInput"
              fullWidth
            />
          </EuiFormRow>
        ) : (
          <>
            <EuiFormRow
              data-test-subj="remoteClusterFormProxyAddressFormRow"
              label={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldProxyAddressLabel"
                  defaultMessage="Proxy address"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldProxyAddressHelpText"
                  defaultMessage="The address to use for remote connections."
                />
              }
              isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
              error={proxyAddressError}
              fullWidth
            >
              <EuiFieldText
                value={proxyAddress}
                placeholder={i18n.translate(
                  'xpack.remoteClusters.remoteClusterForm.fieldProxyAddressPlaceholder',
                  {
                    defaultMessage: 'host:port',
                  }
                )}
                onChange={(e) => onFieldsChange({ proxyAddress: e.target.value })}
                isInvalid={Boolean(areErrorsVisible && proxyAddressError)}
                data-test-subj="remoteClusterFormProxyAddressInput"
                fullWidth
              />
            </EuiFormRow>

            <EuiFormRow
              data-test-subj="remoteClusterFormServerNameFormRow"
              isInvalid={Boolean(areErrorsVisible && serverNameError)}
              error={serverNameError}
              label={
                isCloudEnabled ? (
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.fieldServerNameRequiredLabel"
                    defaultMessage="Server name"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.fieldServerNameOptionalLabel"
                    defaultMessage="Server name (optional)"
                  />
                )
              }
              helpText={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText"
                  defaultMessage="A string sent in the server_name field of the TLS Server Name Indication extension if TLS is enabled. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink href={proxySettingsUrl} target="_blank">
                        <FormattedMessage
                          id="xpack.remoteClusters.remoteClusterForm.fieldServerNameHelpText.learnMoreLinkLabel"
                          defaultMessage="Learn more."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              }
              fullWidth
            >
              <EuiFieldText
                value={serverName}
                onChange={(e) => onFieldsChange({ serverName: e.target.value })}
                isInvalid={Boolean(areErrorsVisible && serverNameError)}
                fullWidth
              />
            </EuiFormRow>
          </>
        )}

        <EuiFormRow
          data-test-subj="remoteClusterFormProxySocketConnectionsFormRow"
          label={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldProxySocketConnectionsLabel"
              defaultMessage="Socket connections"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldSocketConnectionsHelpText"
              defaultMessage="The number of socket connections to open per remote cluster."
            />
          }
          fullWidth
        >
          <EuiFieldNumber
            value={proxySocketConnections || ''}
            onChange={(e) => onFieldsChange({ proxySocketConnections: Number(e.target.value) })}
            fullWidth
          />
        </EuiFormRow>
      </>
    );
  };

  return (
    <EuiDescribedFormGroup
      title={
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.sectionModeTitle"
              defaultMessage="Connection mode"
            />
          </h2>
        </EuiTitle>
      }
      description={
        <>
          {isCloudEnabled ? descriptionOnCloud : description}
          {isCloudEnabled ? (
            <>
              <EuiFormRow hasEmptyLabelSpace fullWidth>
                <EuiSwitch
                  label={
                    <FormattedMessage
                      id="xpack.remoteClusters.remoteClusterForm.manualModeFieldLabel"
                      defaultMessage="Enter proxy address and server name manually"
                    />
                  }
                  checked={!isCloudUrl}
                  data-test-subj="remoteClusterFormCloudUrlToggle"
                  onChange={(e) => onFieldsChange({ isCloudUrl: !e.target.checked })}
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiCallOut size="m">
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.manualModeFieldHelpText"
                  defaultMessage="If you configured a custom endpoint alias, either in Elastic Cloud,
                    in your reverse proxy or load-balancer, you will need to copy-paste the Proxy address and
                    Server name manually. These values can be copied from the Remote parameters section
                    on the remote deployment Security page. More information is available {docsLink}"
                  values={{
                    docsLink: (
                      <EuiLink href={cloudRemoteClustersUrl} target="_blank" external={true}>
                        <FormattedMessage
                          id="xpack.remoteClusters.remoteClusterForm.manualModeDocsLink"
                          defaultMessage="here"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiCallOut>
            </>
          ) : null}
        </>
      }
      fullWidth
    >
      {mode === SNIFF_MODE ? renderSniffModeSettings() : renderProxyModeSettings()}
    </EuiDescribedFormGroup>
  );
};
