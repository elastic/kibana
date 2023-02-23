/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiDescriptionList } from '@elastic/eui';
import { css, euiStyled } from '@kbn/kibana-react-plugin/common';
import { i18n } from '@kbn/i18n';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { OUTPUT_MESSAGES } from '../translations';
import { getUiCommand } from './hooks';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { ResponseActionFileDownloadLink } from '../../response_action_file_download_link';
import { ExecuteActionHostResponseOutput } from '../../endpoint_execute_action';
import { getEmptyValue } from '../../../../common/components/empty_value';

import { type ActionDetails, type MaybeImmutable } from '../../../../../common/endpoint/types';
const EXECUTE_FILE_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.responseActionExecuteDownloadLink.downloadButtonLabel',
  { defaultMessage: 'Click here to download full output' }
);
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
      margin-top: ${(props) => props.theme.eui.euiSizeS};
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

const OutputContent = memo<{ action: MaybeImmutable<ActionDetails>; 'data-test-subj'?: string }>(
  ({ action, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const { canWriteFileOperations, canWriteExecuteOperations } =
      useUserPrivileges().endpointPrivileges;

    const { command, isCompleted, isExpired, wasSuccessful } = action;

    if (isExpired) {
      return <>{OUTPUT_MESSAGES.hasExpired(command)}</>;
    }

    if (!isCompleted) {
      return <>{OUTPUT_MESSAGES.isPending(command)}</>;
    }

    if (!wasSuccessful) {
      return <>{OUTPUT_MESSAGES.hasFailed(command)}</>;
    }

    if (command === 'get-file') {
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

    if (command === 'execute') {
      return (
        <EuiFlexGroup direction="column" data-test-subj={getTestId('executeDetails')}>
          {action.agents.map((agentId) => (
            <div key={agentId}>
              {OUTPUT_MESSAGES.wasSuccessful(command)}
              <EuiFlexItem>
                <ResponseActionFileDownloadLink
                  action={action}
                  buttonTitle={EXECUTE_FILE_LINK_TITLE}
                  canAccessFileDownloadLink={canWriteExecuteOperations}
                  data-test-subj={getTestId('getExecuteLink')}
                  textSize="xs"
                />
              </EuiFlexItem>
              <ExecuteActionHostResponseOutput
                action={action}
                agentId={agentId}
                data-test-subj={getTestId('executeResponseOutput')}
                textSize="xs"
              />
            </div>
          ))}
        </EuiFlexGroup>
      );
    }

    return <>{OUTPUT_MESSAGES.wasSuccessful(command)}</>;
  }
);

OutputContent.displayName = 'OutputContent';

export const ActionsLogExpandedTray = memo<{
  action: MaybeImmutable<ActionDetails>;
  'data-test-subj'?: string;
}>(({ action, 'data-test-subj': dataTestSubj }) => {
  const getTestId = useTestIdGenerator(dataTestSubj);

  const { startedAt, completedAt, command: _command, comment, parameters } = action;

  const parametersList = useMemo(
    () =>
      parameters
        ? Object.entries(parameters).map(([key, value]) => {
            return `${key}:${value}`;
          })
        : undefined,
    [parameters]
  );

  const command = getUiCommand(_command);

  const dataList = useMemo(
    () =>
      [
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
          description: parametersList ? parametersList : emptyValue,
        },
        {
          title: OUTPUT_MESSAGES.expandSection.comment,
          description: comment ? comment : emptyValue,
        },
      ].map(({ title, description }) => {
        return {
          title: <StyledEuiCodeBlock>{title}</StyledEuiCodeBlock>,
          description: <StyledEuiCodeBlock>{description}</StyledEuiCodeBlock>,
        };
      }),
    [command, comment, completedAt, parametersList, startedAt]
  );

  const outputList = useMemo(
    () => [
      {
        title: (
          <StyledEuiCodeBlock>{`${OUTPUT_MESSAGES.expandSection.output}:`}</StyledEuiCodeBlock>
        ),
        description: (
          // codeblock for output
          <StyledEuiCodeBlock data-test-subj={getTestId('details-tray-output')}>
            <OutputContent action={action} data-test-subj={dataTestSubj} />
          </StyledEuiCodeBlock>
        ),
      },
    ],
    [action, dataTestSubj, getTestId]
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
