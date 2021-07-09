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
  EuiCallOut,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';

storiesOf('Deprecated/Sidebar/ElementSettings', module).add(
  'Markdown deprecation. v1. Example',
  () => {
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
  }
);
