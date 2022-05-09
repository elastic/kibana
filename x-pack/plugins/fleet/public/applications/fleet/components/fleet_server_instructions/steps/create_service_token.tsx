/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import type { EuiStepProps } from '@elastic/eui';
import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
  max-width: 100%;
`;

export const ContentWrapper = styled(EuiFlexGroup)`
  height: 100%;
  margin: 0 auto;
  max-width: 800px;
`;

// Otherwise the copy button is over the text
const CommandCode = styled.div.attrs(() => {
  return {
    className: 'eui-textBreakAll',
  };
})`
  margin-right: ${(props) => props.theme.eui.paddingSizes.m};
`;

export const getGenerateServiceTokenStep = ({
  disabled = false,
  serviceToken,
  generateServiceToken,
  isLoadingServiceToken,
}: {
  disabled?: boolean;
  serviceToken?: string;
  generateServiceToken: () => void;
  isLoadingServiceToken: boolean;
}): EuiStepProps => {
  return {
    title: i18n.translate('xpack.fleet.fleetServerSetup.stepGenerateServiceTokenTitle', {
      defaultMessage: 'Generate a service token',
    }),
    status: disabled ? 'disabled' : undefined,
    children: !disabled && (
      <ServiceTokenStepContent
        serviceToken={serviceToken}
        generateServiceToken={generateServiceToken}
        isLoadingServiceToken={isLoadingServiceToken}
      />
    ),
  };
};

const ServiceTokenStepContent: React.FunctionComponent<{
  serviceToken?: string;
  generateServiceToken: () => void;
  isLoadingServiceToken: boolean;
}> = ({ serviceToken, generateServiceToken, isLoadingServiceToken }) => {
  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.fleetServerSetup.generateServiceTokenDescription"
          defaultMessage="A service token grants Fleet Server permissions to write to Elasticsearch."
        />
      </EuiText>
      <EuiSpacer size="m" />
      {!serviceToken ? (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isLoadingServiceToken}
              isDisabled={isLoadingServiceToken}
              onClick={() => {
                generateServiceToken();
              }}
              data-test-subj="fleetServerGenerateServiceTokenBtn"
            >
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.generateServiceTokenButton"
                defaultMessage="Generate service token"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>
          <EuiCallOut
            iconType="check"
            size="s"
            color="success"
            title={
              <FormattedMessage
                id="xpack.fleet.fleetServerSetup.saveServiceTokenDescription"
                defaultMessage="Save your service token information. This will be shown only once."
              />
            }
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <strong>
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.serviceTokenLabel"
                  defaultMessage="Service token"
                />
              </strong>
            </EuiFlexItem>
            <FlexItemWithMinWidth>
              <EuiCodeBlock paddingSize="m" isCopyable>
                <CommandCode>{serviceToken}</CommandCode>
              </EuiCodeBlock>
            </FlexItemWithMinWidth>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};
