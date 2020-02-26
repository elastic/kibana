/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EnrollmentApiKeysTable,
  useEnrollmentApiKey,
  useEnrollmentApiKeys,
} from './enrollment_api_keys';
import {
  ContainerEnrollmentInstructions,
  ShellEnrollmentInstructions,
  ToolsEnrollmentInstructions,
} from './enrollment_instructions';
import { useCore } from '../../../../hooks';

interface RouterProps {
  onClose: () => void;
}

export const AgentEnrollmentFlyout: React.FunctionComponent<RouterProps> = ({ onClose }) => {
  const core = useCore();
  const [quickInstallType, setQuickInstallType] = useState<'shell' | 'container' | 'tools'>(
    'shell'
  );
  // api keys
  const enrollmentApiKeys = useEnrollmentApiKeys({
    currentPage: 1,
    pageSize: 1000,
  });
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  React.useEffect(() => {
    if (!selectedApiKeyId && enrollmentApiKeys.data && enrollmentApiKeys.data.list.length > 0) {
      setSelectedApiKeyId(enrollmentApiKeys.data.list[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentApiKeys.data]);
  const apiKey = useEnrollmentApiKey(selectedApiKeyId);

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetAgentEnrollmentFlyoutTitle">
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.flyoutTitle"
            defaultMessage="Install agent"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.flyoutDescription"
            defaultMessage="Enroll a new agent into Fleet."
          />
        </p>
      </EuiText>
    </EuiFlyoutHeader>
  );

  const configOptions = enrollmentApiKeys.data
    ? enrollmentApiKeys.data.list.map(key => ({
        value: key.id,
        text: key.name,
      }))
    : [];

  const [apiKeyListVisible, setApiKeyListVisble] = useState(false);
  const renderedConfigSelect = (
    <>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.selectKeyTitle"
            defaultMessage="Select API key"
          />
        }
      >
        <EuiSelect
          options={configOptions}
          value={selectedApiKeyId || undefined}
          onChange={e => setSelectedApiKeyId(e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        onClick={() => {
          setApiKeyListVisble(!apiKeyListVisible);
        }}
        iconType={apiKeyListVisible ? 'arrowUp' : 'arrowDown'}
        iconSide="right"
        size="xs"
        flush="left"
      >
        {apiKeyListVisible ? (
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.hideKeysButton"
            defaultMessage="Hide API keys"
          />
        ) : (
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.manageKeysButton"
            defaultMessage="Manage API keys"
          />
        )}
      </EuiButtonEmpty>
      {apiKeyListVisible && (
        <>
          <EuiSpacer size="m" />
          <EnrollmentApiKeysTable onChange={() => enrollmentApiKeys.refresh()} />
        </>
      )}
    </>
  );

  const renderedInstructions = apiKey.data && (
    <Fragment>
      <EuiText>
        <h5>
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.quickInstallTitle"
            defaultMessage="Quick installation"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFilterGroup>
        <EuiFilterButton
          hasActiveFilters={quickInstallType === 'shell'}
          onClick={() => setQuickInstallType('shell')}
        >
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.shellInstallButtonText"
            defaultMessage="Shell"
          />
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={quickInstallType === 'container'}
          onClick={() => setQuickInstallType('container')}
        >
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.containerInstallButtonText"
            defaultMessage="Container"
          />
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={quickInstallType === 'tools'}
          onClick={() => setQuickInstallType('tools')}
        >
          <FormattedMessage
            id="xpack.ingestManager.agentEnrollment.toolsInstallButtonText"
            defaultMessage="Tools"
          />
        </EuiFilterButton>
      </EuiFilterGroup>
      <EuiSpacer size="m" />
      {quickInstallType === 'shell' ? (
        <ShellEnrollmentInstructions
          apiKey={apiKey.data.item}
          kibanaUrl={`${window.location.origin}${core.http.basePath.get()}`}
        />
      ) : null}
      {quickInstallType === 'container' ? <ContainerEnrollmentInstructions /> : null}
      {quickInstallType === 'tools' ? <ToolsEnrollmentInstructions /> : null}
    </Fragment>
  );

  const body = (
    <EuiFlyoutBody>
      {renderedConfigSelect}
      <EuiHorizontalRule margin="xl" />
      {renderedInstructions}
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            Close
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onClose}>
            Continue
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={950}>
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};
