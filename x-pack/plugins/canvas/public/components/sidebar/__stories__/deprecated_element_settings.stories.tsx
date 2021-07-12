/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { storiesOf } from '@storybook/react';
import {
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiFieldText,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
  EuiToken,
  EuiTreeView,
  useEuiTextDiff,
} from '@elastic/eui';

const TreeView = () => {
  const items = [
    {
      label: (
        <>
          <del>markdown</del> {`->`} markdownVis
        </>
      ),
      id: 'item_one',
      icon: <EuiToken iconType="tokenFunction" />,
      iconWhenExpanded: <EuiToken iconType="tokenFunction" />,
      isExpanded: true,
      children: [
        {
          label: (
            <>
              <del>content</del> {`->`} markdown
            </>
          ),
          id: 'item_a',
          icon: <EuiIcon type="sortRight" color="primary" />,
        },
        {
          label: 'openLinksInNewTab',
          id: 'item_a',
          icon: <EuiIcon type="plus" color="success" />,
        },
        {
          label: <del>font</del>,
          id: 'item_a',
          icon: <EuiIcon color="danger" type="eraser" />,
        },
      ],
    },
  ];
  return (
    <EuiSplitPanel.Outer direction="row">
      <EuiSplitPanel.Inner>
        <EuiTreeView items={items} aria-label="Sample Folder Tree" />
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner color="subdued">
        <EuiText>
          <p>Attribute `markdown`:</p>
        </EuiText>
        <EuiText>
          <span>Type: string</span>
        </EuiText>
        <EuiText>
          <span>Required: true</span>
        </EuiText>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

storiesOf('Deprecated/Sidebar/ElementSettings', module)
  .add('Markdown deprecation. v1. Example', () => {
    const columns = [
      {
        field: 'deprecated',
        name: 'Expression/Argument',
      },
      {
        field: 'replacement',
        name: 'Replacement/Addition',
      },
      {
        field: 'type',
        name: 'Type',
      },
      {
        field: 'notes',
        name: 'Notes',
      },
    ];

    const items = [
      {
        deprecated: 'markdown',
        replacement: 'markdownVis',
        type: 'Expression',
      },
      {
        deprecated: 'content',
        replacement: 'markdown',
        type: 'Argument',
        notes: '`markdown` is required while `content` was not',
      },
    ];

    const tabs = [
      {
        id: 'deprecated',
        name: (
          <span>
            <EuiIcon type="alert" color="warning" />
            &nbsp;Deprecated
          </span>
        ),
        content: (
          <EuiPanel paddingSize="l">
            <EuiSpacer size="m" />
            <EuiCallOut
              title="Attention! `Markdown` is deprecated in favor of `MarkdownVis`."
              color="warning"
              iconType="flag"
            >
              <p>
                Please, update <strong>Expression</strong> based on the guidelines to avoid problems
                in the future <strong>v8.0.0 release</strong>.
              </p>
            </EuiCallOut>
            <EuiHorizontalRule size="full" />
            <EuiTitle size="m">
              <h4>Deprecation notes</h4>
            </EuiTitle>
            <EuiHorizontalRule size="full" />
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={items}
              rowHeader="firstName"
              columns={columns}
              responsive={false}
            />
          </EuiPanel>
        ),
      },
    ];
    return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />;
  })
  .add('Markdown deprecation. v2. Example', () => {
    const currentExpression = `markdown content="..." openLinksInNewTab="true" font="..."`;
    const updatedExpression = `markdownVis markdown="..." openLinksInNewTab="true"`;

    const [rendered, textDiffObject] = useEuiTextDiff({
      beforeText: currentExpression,
      afterText: updatedExpression,
    });

    const tabs = [
      {
        id: 'deprecated',
        name: (
          <span>
            <EuiIcon type="alert" color="warning" />
            &nbsp;Deprecated
          </span>
        ),
        content: (
          <EuiPanel paddingSize="l">
            <EuiSpacer size="m" />
            <EuiCallOut
              title="Attention! `Markdown` is deprecated in favor of `MarkdownVis`."
              color="warning"
              iconType="flag"
            >
              <p>
                Please, update <strong>Expression</strong> based on the guidelines to avoid problems
                in the future <strong>v8.0.0 release</strong>.
              </p>
            </EuiCallOut>
            <EuiHorizontalRule size="full" />
            <div>
              <EuiText>
                <EuiTitle>
                  <h2>Possible update of the expression:</h2>
                </EuiTitle>
                <p>
                  Your current expression:
                  <EuiCode>{currentExpression}</EuiCode>
                </p>
                <p>
                  Updated expression:
                  <EuiCode>{updatedExpression}</EuiCode>
                </p>
                <p>
                  Diff view:
                  <EuiCode>{rendered}</EuiCode>
                </p>
              </EuiText>
            </div>
            <EuiHorizontalRule size="full" />
            <div>
              <EuiText>
                <EuiTitle>
                  <h2>Conficts:</h2>
                </EuiTitle>
                <p>
                  <ol>
                    <li>
                      <EuiCode>markdown.openLinksInNewTab</EuiCode> and{' '}
                      <EuiCode>markdownVis.openLinksInNewTab</EuiCode> have incompatible types.
                    </li>
                    <li>
                      <EuiCode>markdown.font</EuiCode> is deprecated.
                    </li>
                  </ol>
                </p>
              </EuiText>
            </div>
            <EuiHorizontalRule size="full" />
            <EuiTitle>
              <h2>Deprecation notes:</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <TreeView />
          </EuiPanel>
        ),
      },
    ];
    return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />;
  })
  .add('Markdown deprecation. v3. Example', () => {
    const currentExpression = `markdown content="..." openLinksInNewTab="true" font="..."`;
    const updatedExpression = `markdownVis markdown="..." openLinksInNewTab="true"`;

    const tabs = [
      {
        id: 'deprecated',
        name: (
          <span>
            <EuiIcon type="alert" color="warning" />
            &nbsp;Deprecated
          </span>
        ),
        content: (
          <EuiPanel paddingSize="l">
            <EuiSpacer size="m" />
            <EuiCallOut
              title="Markdown is deprecated. Please, use markdownVis."
              color="warning"
              iconType="flag"
            />
            <EuiSpacer size="m" />
            <div>
              <EuiText>
                <p>
                  Current expression:
                  <EuiFieldText
                    placeholder="Current expression"
                    value={currentExpression}
                    aria-label="Use aria labels when no actual label is in use"
                  />
                </p>
                <p>
                  Proposed expression:
                  <EuiFieldText
                    placeholder="Updated expression"
                    value={updatedExpression}
                    aria-label="Use aria labels when no actual label is in use"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="m" />
              <EuiButton iconType={'check'}>Update</EuiButton>
            </div>
            <EuiHorizontalRule size="full" />
            <EuiTitle>
              <h2>Deprecation notes:</h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <TreeView />
          </EuiPanel>
        ),
      },
    ];
    return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} size="s" />;
  });
