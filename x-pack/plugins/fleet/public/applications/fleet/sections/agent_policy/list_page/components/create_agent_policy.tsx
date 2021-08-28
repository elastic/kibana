/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';
import styled from 'styled-components';

import { dataTypes } from '../../../../../../../common/constants/epm';
import type {
  AgentPolicy,
  NewAgentPolicy,
} from '../../../../../../../common/types/models/agent_policy';
import { useCapabilities } from '../../../../../../hooks/use_capabilities';
import { useStartServices } from '../../../../../../hooks/use_core';
import { sendCreateAgentPolicy } from '../../../../../../hooks/use_request/agent_policy';
import { AgentPolicyForm, agentPolicyFormValidation } from '../../components/agent_policy_form';

const FlyoutWithHigherZIndex = styled(EuiFlyout)`
  z-index: ${(props) => props.theme.eui.euiZLevel5};
`;

interface Props extends EuiFlyoutProps {
  onClose: (createdAgentPolicy?: AgentPolicy) => void;
}

export const CreateAgentPolicyFlyout: React.FunctionComponent<Props> = ({
  onClose,
  as,
  ...restOfProps
}) => {
  const { notifications } = useStartServices();
  const hasWriteCapabilites = useCapabilities().write;
  const [agentPolicy, setAgentPolicy] = useState<NewAgentPolicy>({
    name: '',
    description: '',
    namespace: 'default',
    is_default: undefined,
    monitoring_enabled: Object.values(dataTypes),
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
  const validation = agentPolicyFormValidation(agentPolicy);

  const updateAgentPolicy = (updatedFields: Partial<NewAgentPolicy>) => {
    setAgentPolicy({
      ...agentPolicy,
      ...updatedFields,
    });
  };

  const createAgentPolicy = async () => {
    return await sendCreateAgentPolicy(agentPolicy, { withSysMonitoring });
  };

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="CreateAgentPolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="CreateAgentPolicyFlyoutTitle">
          <FormattedMessage
            id="xpack.fleet.createAgentPolicy.flyoutTitle"
            defaultMessage="Create agent policy"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.fleet.createAgentPolicy.flyoutTitleDescription"
            defaultMessage="Agent policies are used to manage settings across a group of agents. You can add integrations to your agent policy to specify what data your agents collect. When you edit an agent policy, you can use Fleet to deploy updates to a specified group of agents."
          />
        </p>
      </EuiText>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <AgentPolicyForm
        agentPolicy={agentPolicy}
        updateAgentPolicy={updateAgentPolicy}
        withSysMonitoring={withSysMonitoring}
        updateSysMonitoring={(newValue) => setWithSysMonitoring(newValue)}
        validation={validation}
      />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => onClose()} flush="left">
            <FormattedMessage
              id="xpack.fleet.createAgentPolicy.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={isLoading}
            isDisabled={!hasWriteCapabilites || isLoading || Object.keys(validation).length > 0}
            onClick={async () => {
              setIsLoading(true);
              try {
                const { data, error } = await createAgentPolicy();
                setIsLoading(false);
                if (data) {
                  notifications.toasts.addSuccess(
                    i18n.translate('xpack.fleet.createAgentPolicy.successNotificationTitle', {
                      defaultMessage: "Agent policy '{name}' created",
                      values: { name: agentPolicy.name },
                    })
                  );
                  onClose(data.item);
                } else {
                  notifications.toasts.addDanger(
                    error
                      ? error.message
                      : i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
                          defaultMessage: 'Unable to create agent policy',
                        })
                  );
                }
              } catch (e) {
                setIsLoading(false);
                notifications.toasts.addDanger(
                  i18n.translate('xpack.fleet.createAgentPolicy.errorNotificationTitle', {
                    defaultMessage: 'Unable to create agent policy',
                  })
                );
              }
            }}
          >
            <FormattedMessage
              id="xpack.fleet.createAgentPolicy.submitButtonLabel"
              defaultMessage="Create agent policy"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <FlyoutWithHigherZIndex onClose={() => onClose()} size="l" maxWidth={400} {...restOfProps}>
      {header}
      {body}
      {footer}
    </FlyoutWithHigherZIndex>
  );
};
