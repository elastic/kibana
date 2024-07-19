/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { css, euiStyled } from '@kbn/kibana-react-plugin/common';
import { reduce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { getAgentTypeName } from '../../../../common/translations';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import {
  isExecuteAction,
  isGetFileAction,
  isUploadAction,
} from '../../../../../common/endpoint/service/response_actions/type_guards';
import { EndpointUploadActionResult } from '../../endpoint_upload_action_result';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { OUTPUT_MESSAGES } from '../translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { ResponseActionFileDownloadLink } from '../../response_action_file_download_link';
import { EndpointActionFailureMessage } from '../../endpoint_action_failure_message';
import { ExecuteActionHostResponse } from '../../endpoint_execute_action';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { type ActionDetails, type MaybeImmutable } from '../../../../../common/endpoint/types';

const emptyValue = getEmptyValue();

const customDescriptionListCss = css`
  &.euiDescriptionList {
    > .euiDescriptionList__title {
      color: ${(props) => props.theme.eui.euiColorDarkShade};
      font-size: ${(props) => props.theme.eui.euiFontSizeXS};
    }

    > .euiDescriptionList__title,
    > .euiDescriptionList__description {
      font-weight: ${(props) => props.theme.eui.euiFontWeightRegular};
    }
  }
`;
const topSpacingCss = css`
  ${(props) => `${props.theme.eui.euiSize} 0`}
`;
const dashedBorderCss = css`
  ${(props) => `1px dashed ${props.theme.eui.euiColorDisabled}`};
`;
const StyledDescriptionListOutput = euiStyled(EuiDescriptionList).attrs({ compressed: true })`
  ${customDescriptionListCss}
  dd {
    margin: ${topSpacingCss};
    padding: ${topSpacingCss};
    border-top: ${dashedBorderCss};
    border-bottom: ${dashedBorderCss};
  }
`;

const StyledDescriptionList = euiStyled(EuiDescriptionList).attrs({
  compressed: true,
  type: 'column',
})`
  ${customDescriptionListCss}
`;

const StyledEuiCodeBlock = euiStyled(EuiCodeBlock).attrs({
  transparentBackground: true,
  paddingSize: 'none',
})`
  code {
    color: ${(props) => props.theme.eui.euiColorDarkShade} !important;
  }
`;

const StyledEuiFlexGroup = euiStyled(EuiFlexGroup).attrs({
  direction: 'column',
  className: 'eui-yScrollWithShadows',
  gutterSize: 's',
})`
  max-height: 270px;
  overflow-y: auto;
`;

const OutputContent = memo<{
  action: MaybeImmutable<ActionDetails>;
  fromAlertWorkaround?: boolean;
  'data-test-subj'?: string;
}>(({ action, fromAlertWorkaround = false, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  const {
    canWriteFileOperations,
    canReadActionsLogManagement,
    canAccessEndpointActionsLogManagement,
  } = useUserPrivileges().endpointPrivileges;

  const { command: _command, isCompleted, isExpired, wasSuccessful } = action;
  const command = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[_command];

  // FIXME:PT remove once automated response actions are corrected to use `ActionDetails` (team issue 9822)
  if (fromAlertWorkaround && action.errors?.length) {
    return (
      <>
        {(
          action.errors ?? [
            i18n.translate('xpack.securitySolution.actionLogExpandedTray.missingErrors', {
              defaultMessage: 'Action did not specify any errors',
            }),
          ]
        ).map((error) => (
          <EuiFlexItem>{error}</EuiFlexItem>
        ))}
      </>
    );
  }

  if (isExpired) {
    return <>{OUTPUT_MESSAGES.hasExpired(command)}</>;
  }

  if (!isCompleted) {
    return <>{OUTPUT_MESSAGES.isPending(command)}</>;
  }

  if (!wasSuccessful) {
    return (
      <>
        {OUTPUT_MESSAGES.hasFailed(command)}
        <EuiSpacer size="s" />
        <EndpointActionFailureMessage
          action={action}
          data-test-subj={getTestId('failureMessage')}
        />
      </>
    );
  }

  if (isGetFileAction(action)) {
    return (
      <>
        {OUTPUT_MESSAGES.wasSuccessful(command)}
        <ResponseActionFileDownloadLink
          action={action}
          canAccessFileDownloadLink={canWriteFileOperations}
          textSize="xs"
          data-test-subj={getTestId('getFileDownloadLink')}
        />
      </>
    );
  }

  if (isExecuteAction(action)) {
    return (
      <EuiFlexGroup direction="column" data-test-subj={getTestId('executeDetails')}>
        {action.agents.map((agentId) => (
          <div key={agentId}>
            {OUTPUT_MESSAGES.wasSuccessful(command)}
            <ExecuteActionHostResponse
              action={action}
              agentId={agentId}
              canAccessFileDownloadLink={
                canAccessEndpointActionsLogManagement || canReadActionsLogManagement
              }
              textSize="xs"
              data-test-subj={getTestId('actionsLogTray')}
            />
          </div>
        ))}
      </EuiFlexGroup>
    );
  }

  if (isUploadAction(action)) {
    return (
      <EuiFlexGroup direction="column" data-test-subj={getTestId('uploadDetails')}>
        <p>{OUTPUT_MESSAGES.wasSuccessful(command)}</p>

        <EndpointUploadActionResult
          action={action}
          data-test-subj={getTestId('uploadOutput')}
          textSize="xs"
        />
      </EuiFlexGroup>
    );
  }

  if (action.agentType === 'crowdstrike') {
    return <>{OUTPUT_MESSAGES.submittedSuccessfully(command)}</>;
  }
  return <>{OUTPUT_MESSAGES.wasSuccessful(command)}</>;
});

OutputContent.displayName = 'OutputContent';

export const ActionsLogExpandedTray = memo<{
  action: MaybeImmutable<ActionDetails>;
  // Delete prop `fromAlert` once we refactor automated response actions
  fromAlertWorkaround?: boolean;
  'data-test-subj'?: string;
}>(({ action, fromAlertWorkaround = false, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  const isSentinelOneV1Enabled = useIsExperimentalFeatureEnabled(
    'responseActionsSentinelOneV1Enabled'
  );

  const {
    hosts,
    startedAt,
    completedAt,
    command: _command,
    comment,
    parameters,
    agentType,
  } = action;

  const parametersList = useMemo(
    () =>
      parameters
        ? Object.entries(parameters).map(([key, value]) => {
            return `${key}: ${value}`;
          })
        : undefined,
    [parameters]
  );

  const command = RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[_command];

  const dataList = useMemo(() => {
    const list = [
      {
        title: OUTPUT_MESSAGES.expandSection.placedAt,
        description: `${startedAt}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.startedAt,
        description: `${startedAt}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.completedAt,
        description: `${completedAt ?? emptyValue}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.input,
        description: `${command}`,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.parameters,
        description: parametersList ? parametersList.join(', ') : emptyValue,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.comment,
        description: comment ? comment : emptyValue,
      },
      {
        title: OUTPUT_MESSAGES.expandSection.hostname,
        description:
          reduce(
            hosts,
            (acc, host) => {
              if (host.name.trim().length) {
                acc.push(host.name);
              } else {
                acc.push(emptyValue);
              }
              return acc;
            },
            [] as string[]
          ).join(', ') || emptyValue,
      },
    ];

    if (isSentinelOneV1Enabled) {
      list.push({
        title: OUTPUT_MESSAGES.expandSection.agentType,
        description: getAgentTypeName(agentType) || emptyValue,
      });
    }

    return list.map(({ title, description }) => {
      return {
        title: <StyledEuiCodeBlock>{title}</StyledEuiCodeBlock>,
        description: (
          <StyledEuiCodeBlock data-test-subj={getTestId(`action-details-info-${title}`)}>
            {description}
          </StyledEuiCodeBlock>
        ),
      };
    });
  }, [
    agentType,
    command,
    comment,
    completedAt,
    getTestId,
    hosts,
    isSentinelOneV1Enabled,
    parametersList,
    startedAt,
  ]);

  const outputList = useMemo(
    () => [
      {
        title: (
          <StyledEuiCodeBlock>{`${OUTPUT_MESSAGES.expandSection.output}:`}</StyledEuiCodeBlock>
        ),
        description: (
          // codeblock for output
          <StyledEuiCodeBlock data-test-subj={getTestId('details-tray-output')}>
            <OutputContent
              action={action}
              data-test-subj={dataTestSubj}
              fromAlertWorkaround={fromAlertWorkaround}
            />
          </StyledEuiCodeBlock>
        ),
      },
    ],
    [action, dataTestSubj, fromAlertWorkaround, getTestId]
  );

  return (
    <>
      <StyledEuiFlexGroup data-test-subj={getTestId('details-tray')}>
        <EuiFlexItem grow={false}>
          <StyledDescriptionList listItems={dataList} />
        </EuiFlexItem>
        <EuiFlexItem>
          <StyledDescriptionListOutput listItems={outputList} />
        </EuiFlexItem>
      </StyledEuiFlexGroup>
    </>
  );
});

ActionsLogExpandedTray.displayName = 'ActionsLogExpandedTray';
