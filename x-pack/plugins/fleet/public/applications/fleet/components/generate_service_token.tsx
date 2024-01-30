/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';

import { EuiLink, EuiToolTip } from '@elastic/eui';
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

import { useStartServices } from '../../../hooks';
import { useCheckPermissions } from '../hooks';

const FlexItemWithMinWidth = styled(EuiFlexItem)`
  min-width: 0px;
  max-width: 100%;
`;

// Otherwise the copy button is over the text
const CommandCode = styled.div.attrs(() => {
  return {
    className: 'eui-textBreakAll',
  };
})`
  margin-right: ${(props) => props.theme.eui.euiSizeM};
`;

export const GenerateServiceTokenComponent: React.FunctionComponent<{
  serviceToken?: string;
  generateServiceToken: (remote?: boolean) => void;
  isLoadingServiceToken: boolean;
  isRemote?: boolean;
}> = ({ serviceToken, generateServiceToken, isLoadingServiceToken, isRemote = false }) => {
  const { docLinks } = useStartServices();
  const { permissionsError, isPermissionsLoading } = useCheckPermissions();

  return (
    <>
      <EuiText>
        {isRemote ? (
          <FormattedMessage
            id="xpack.fleet.settings.remoteServiceToken.generateServiceTokenDescription"
            defaultMessage="A service token grants Fleet Server permissions to write to Elasticsearch, and can be used to configure this Elasticsearch cluster for remote output. For more information, see the {fleetUserGuide}."
            values={{
              fleetUserGuide: (
                <EuiLink href={docLinks.links.fleet.guide} target="_blank">
                  {i18n.translate('xpack.fleet.settings.editOutputFlyout.fleetUserGuideLabel', {
                    defaultMessage: 'Fleet User Guide',
                  })}
                </EuiLink>
              ),
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.fleetServerSetup.generateServiceTokenDescription"
            defaultMessage="A service token grants Fleet Server permissions to write to Elasticsearch."
          />
        )}
      </EuiText>
      <EuiSpacer size="m" />
      {!serviceToken ? (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={
                isRemote && !!permissionsError ? (
                  <FormattedMessage
                    id="xpack.fleet.settings.remoteServiceToken.noPermissionTooltip"
                    defaultMessage="To generate service token, you must have the minimum required privileges. Contact your administrator."
                  />
                ) : null
              }
            >
              <EuiButton
                fill
                isLoading={isLoadingServiceToken}
                isDisabled={isLoadingServiceToken || isPermissionsLoading || !!permissionsError}
                onClick={() => {
                  generateServiceToken(isRemote);
                }}
                data-test-subj="fleetServerGenerateServiceTokenBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.fleetServerSetup.generateServiceTokenButton"
                  defaultMessage="Generate service token"
                />
              </EuiButton>
            </EuiToolTip>
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
              <strong data-test-subject="serviceTokenSaveReminderHeader">
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
