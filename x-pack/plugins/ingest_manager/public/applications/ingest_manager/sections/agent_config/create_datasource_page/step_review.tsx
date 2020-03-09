/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiTitle,
  EuiCallOut,
  EuiText,
  EuiCheckbox,
  EuiTabbedContent,
  EuiCodeBlock,
  EuiSpacer,
} from '@elastic/eui';
import { dump } from 'js-yaml';
import { NewDatasource, AgentConfig } from '../../../types';
import { useConfig, sendGetAgentStatus } from '../../../hooks';
import { storedDatasourceToAgentDatasource } from '../../../services';

export const StepReviewDatasource: React.FunctionComponent<{
  agentConfig: AgentConfig;
  datasource: NewDatasource;
  backLink: JSX.Element;
  cancelUrl: string;
  onSubmit: () => void;
  isSubmitLoading: boolean;
}> = ({ agentConfig, datasource, backLink, cancelUrl, onSubmit, isSubmitLoading }) => {
  // Agent count info states
  const [agentCount, setAgentCount] = useState<number>(0);
  const [agentCountChecked, setAgentCountChecked] = useState<boolean>(false);

  // Config information
  const {
    fleet: { enabled: isFleetEnabled },
  } = useConfig();

  // Retrieve agent count
  useEffect(() => {
    const getAgentCount = async () => {
      const { data } = await sendGetAgentStatus({ configId: agentConfig.id });
      if (data?.results.total) {
        setAgentCount(data.results.total);
      }
    };

    if (isFleetEnabled) {
      getAgentCount();
    }
  }, [agentConfig.id, isFleetEnabled]);

  const showAgentDisclaimer = isFleetEnabled && agentCount;
  const fullAgentDatasource = storedDatasourceToAgentDatasource(datasource);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.stepReview.reviewTitle"
                  defaultMessage="Review changes"
                />
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{backLink}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Agents affected warning */}
      {showAgentDisclaimer ? (
        <EuiFlexItem>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.stepReview.agentsAffectedCalloutTitle"
                defaultMessage="This action will affect {count, plural, one {# agemt} other {# agents}}"
                values={{
                  count: agentCount,
                }}
              />
            }
          >
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.ingestManager.createDatasource.stepReview.agentsAffectedCalloutText"
                  defaultMessage="Fleet has detected that the selected agent configuration, {configName} is already in use by some your agents. As a result of this action, Fleet will update all agents that are enrolled with this configuration."
                  values={{
                    configName: <strong>{agentConfig.name}</strong>,
                  }}
                />
              </p>
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      ) : null}

      {/* Preview and YAML view */}
      {/* TODO: Implement preview tab */}
      <EuiFlexItem>
        <EuiTabbedContent
          tabs={[
            {
              id: 'yaml',
              name: i18n.translate('xpack.ingestManager.agentConfigInfo.yamlTabName', {
                defaultMessage: 'YAML',
              }),
              content: (
                <Fragment>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock language="yaml" isCopyable overflowHeight={450}>
                    {dump(fullAgentDatasource)}
                  </EuiCodeBlock>
                </Fragment>
              ),
            },
          ]}
        />
      </EuiFlexItem>

      {/* Confirm agents affected */}
      {showAgentDisclaimer ? (
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h4>
                  <FormattedMessage
                    id="xpack.ingestManager.createDatasource.stepReview.confirmAgentDisclaimerTitle"
                    defaultMessage="Confirm your decision"
                  />
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCheckbox
                id="CreateDatasourceAgentDisclaimer"
                label={
                  <FormattedMessage
                    id="xpack.ingestManager.createDatasource.stepReview.confirmAgentDisclaimerText"
                    defaultMessage="I understand that this action will update all agents that are enrolled with this configuration."
                  />
                }
                checked={agentCountChecked}
                onChange={e => setAgentCountChecked(e.target.checked)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}

      <EuiFlexItem>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={cancelUrl}>
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.cancelLinkText"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onSubmit()}
              isLoading={isSubmitLoading}
              disabled={isSubmitLoading || Boolean(showAgentDisclaimer && !agentCountChecked)}
            >
              <FormattedMessage
                id="xpack.ingestManager.createDatasource.addDatasourceButtonText"
                defaultMessage="Add datasource to configuration"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
