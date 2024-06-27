/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SourcesPanelSidebar } from './sources_panel/sources_panel_sidebar';
import { SummarizationPanel } from './summarization_panel/summarization_panel';

interface ChatSidebarProps {
  selectedIndicesCount: number;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ selectedIndicesCount }) => {
  const { euiTheme } = useEuiTheme();
  const accordions = [
    {
      id: useGeneratedHtmlId({ prefix: 'summarizationAccordion' }),
      title: i18n.translate('xpack.searchPlayground.sidebar.summarizationTitle', {
        defaultMessage: 'Model settings',
      }),
      children: <SummarizationPanel />,
      dataTestId: 'summarizationAccordion',
    },
    {
      id: useGeneratedHtmlId({ prefix: 'sourcesAccordion' }),
      title: i18n.translate('xpack.searchPlayground.sidebar.sourceTitle', {
        defaultMessage: 'Indices',
      }),
      extraAction: !!selectedIndicesCount && (
        <EuiText size="xs">
          <p>
            {i18n.translate('xpack.searchPlayground.sidebar.sourceIndicesCount', {
              defaultMessage: '{count, number} {count, plural, one {Index} other {Indices}}',
              values: { count: Number(selectedIndicesCount) },
            })}
          </p>
        </EuiText>
      ),
      children: <SourcesPanelSidebar />,
      dataTestId: 'sourcesAccordion',
    },
  ];
  const [openAccordionId, setOpenAccordionId] = useState(accordions[0].id);

  return (
    <EuiFlexGroup direction="column" className="eui-yScroll" gutterSize="none">
      {accordions.map(({ id, title, extraAction, children, dataTestId }, index) => (
        <EuiFlexItem
          key={id}
          css={{
            borderBottom: index === accordions.length - 1 ? 'none' : euiTheme.border.thin,
            padding: `0 ${euiTheme.size.l}`,
            flexGrow: openAccordionId === id ? 1 : 0,
            transition: `${euiTheme.animation.normal} ease-in-out`,
          }}
        >
          <EuiAccordion
            id={id}
            buttonContent={
              <EuiTitle size="xs">
                <h5>{title}</h5>
              </EuiTitle>
            }
            extraAction={extraAction}
            buttonProps={{ paddingSize: 'l' }}
            forceState={openAccordionId === id ? 'open' : 'closed'}
            onToggle={() => setOpenAccordionId(openAccordionId === id ? '' : id)}
            data-test-subj={dataTestId}
          >
            {children}
            <EuiSpacer size="l" />
          </EuiAccordion>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
