/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useWatch } from 'react-hook-form';
import { docLinks } from '../../common/doc_links';
import { EditContextPanel } from './edit_context/edit_context_panel';
import { ChatForm, ChatFormFields } from '../types';
import { useManagementLink } from '../hooks/use_management_link';
import { SummarizationPanel } from './summarization_panel/summarization_panel';

export const ChatSidebar: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const selectedModel = useWatch<ChatForm, ChatFormFields.summarizationModel>({
    name: ChatFormFields.summarizationModel,
  });
  const managementLink = useManagementLink(selectedModel?.connectorId);
  const panels = [
    {
      title: i18n.translate('xpack.searchPlayground.sidebar.summarizationTitle', {
        defaultMessage: 'Model settings',
      }),
      children: <SummarizationPanel />,
      extraAction: (
        <EuiButtonEmpty
          target="_blank"
          href={managementLink}
          data-test-subj="manageConnectorsLink"
          iconType="wrench"
          size="s"
          aria-label={i18n.translate(
            'xpack.searchPlayground.sidebar.summarizationModel.manageConnectorLink',
            {
              defaultMessage: 'Manage connector',
            }
          )}
        >
          <FormattedMessage
            id="xpack.searchPlayground.sidebar.summarizationModel.manageConnectorTooltip"
            defaultMessage="Manage"
          />
        </EuiButtonEmpty>
      ),
    },
    {
      title: i18n.translate('xpack.searchPlayground.sidebar.contextTitle', {
        defaultMessage: 'Context',
      }),
      extraAction: (
        <EuiLink
          href={docLinks.context}
          target="_blank"
          data-test-subj="hidden-fields-documentation-link"
        >
          <FormattedMessage
            id="xpack.searchPlayground.sidebar.contextLearnMore"
            defaultMessage="Learn more"
          />
        </EuiLink>
      ),
      children: <EditContextPanel />,
    },
  ];

  return (
    <EuiFlexGroup direction="column" className="eui-yScroll" gutterSize="none">
      {panels?.map(({ title, children, extraAction }) => (
        <EuiFlexItem key={title} grow={false}>
          <EuiFlexGroup direction="column" css={{ padding: euiTheme.size.l }} gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
                <EuiTitle size="xs">
                  <h4>{title}</h4>
                </EuiTitle>
                {extraAction && <EuiFlexItem grow={false}>{extraAction}</EuiFlexItem>}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{children}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
