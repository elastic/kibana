/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { RequestError } from '../../hooks';
import { useStartServices } from '../../hooks';

import { Error } from '../error';
import { Loading } from '../loading';

import {
  useGetUninstallToken,
  useGetUninstallTokens,
} from '../../hooks/use_request/uninstall_tokens';

import { UninstallCommandsPerPlatform } from './uninstall_commands_per_platform';
import type { UninstallCommandTarget } from './types';

const UninstallAgentDescription = () => {
  const { docLinks } = useStartServices();

  return (
    <>
      <p>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.firstParagraph"
          defaultMessage="Uninstall Elastic Agent and unenroll in Fleet to stop communicating with the host."
        />
      </p>
      <h3>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.subtitle"
          defaultMessage="Uninstall Elastic Agent on your host"
        />
      </h3>
      <p>
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.description"
          defaultMessage="Select the appropriate platform and run the command to uninstall Elastic Agent. Reuse the command to uninstall agents on more than one host. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docLinks.links.fleet.uninstallAgent} target="_blank">
                {i18n.translate('xpack.fleet.agentUninstallCommandFlyout.learnMore', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            ),
          }}
        />
      </p>
    </>
  );
};

const UninstallEndpointDescription = () => (
  <>
    <h3>
      <FormattedMessage
        id="xpack.fleet.endpointUninstallCommandFlyout.subtitle"
        defaultMessage="Uninstall Elastic Defend integration on your host"
      />
    </h3>
    <p>
      <FormattedMessage
        id="xpack.fleet.endpointUninstallCommandFlyout.description"
        defaultMessage="Use the below uninstall command to uninstall Endpoint integration... [TODO]"
      />
    </p>
  </>
);

const ErrorFetchingUninstallToken = ({ error }: { error: RequestError | null }) => (
  <Error
    title={
      <FormattedMessage
        id="xpack.fleet.agentUninstallCommandFlyout.errorFetchingToken"
        defaultMessage="Unable to fetch uninstall token"
      />
    }
    error={
      error ??
      i18n.translate('xpack.fleet.agentUninstallCommandFlyout.unknownError', {
        defaultMessage: 'Unknown error',
      })
    }
  />
);

const UninstallCommandsByTokenId = ({ uninstallTokenId }: { uninstallTokenId: string }) => {
  const { isLoading, error, data } = useGetUninstallToken(uninstallTokenId);
  const token = data?.item.token;
  const policyId = data?.item.policy_id;

  return isLoading ? (
    <Loading size="l" />
  ) : error || !token ? (
    <ErrorFetchingUninstallToken error={error} />
  ) : (
    <>
      <UninstallCommandsPerPlatform token={token} />

      <EuiSpacer size="l" />

      <EuiText data-test-subj="uninstall-command-flyout-policy-id-hint">
        <FormattedMessage
          id="xpack.fleet.agentUninstallCommandFlyout.validForPolicyId"
          defaultMessage="Valid for the following agent policy:"
        />{' '}
        <EuiCode>{policyId}</EuiCode>
      </EuiText>
    </>
  );
};

const UninstallCommandsByPolicyId = ({ policyId }: { policyId: string }) => {
  const { isLoading, error, data } = useGetUninstallTokens({ policyId });
  const tokenId = data?.items?.[0]?.id;

  return isLoading ? (
    <Loading size="l" />
  ) : error || !tokenId ? (
    <ErrorFetchingUninstallToken error={error} />
  ) : (
    <UninstallCommandsByTokenId uninstallTokenId={tokenId} />
  );
};

interface BaseProps {
  target: UninstallCommandTarget;
  onClose: () => void;
}

interface PropsWithPolicyId extends BaseProps {
  policyId: string;
  uninstallTokenId?: never;
}
interface PropsWithTokenId extends BaseProps {
  uninstallTokenId: string;
  policyId?: never;
}

export type UninstallCommandFlyoutProps = PropsWithPolicyId | PropsWithTokenId;

/** Flyout to show uninstall commands.
 *
 * Provide EITHER `policyId` OR `tokenId` for showing the token.
 */
export const UninstallCommandFlyout: React.FunctionComponent<UninstallCommandFlyoutProps> = ({
  policyId,
  uninstallTokenId,
  onClose,
  target,
}) => {
  return (
    <EuiFlyout onClose={onClose} data-test-subj="uninstall-command-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.fleet.agentUninstallCommandFlyout.title"
              defaultMessage="Uninstall agent"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiText>
          {target === 'agent' ? <UninstallAgentDescription /> : <UninstallEndpointDescription />}
        </EuiText>

        <EuiSpacer size="l" />

        {uninstallTokenId ? (
          <UninstallCommandsByTokenId uninstallTokenId={uninstallTokenId} />
        ) : policyId ? (
          <UninstallCommandsByPolicyId policyId={policyId} />
        ) : null}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
