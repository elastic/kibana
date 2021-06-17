/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiImage,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiCodeBlock,
  EuiToolTip,
} from '@elastic/eui';
import React, { ComponentType } from 'react';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { SpanIcon } from './index';
import { getSpanIcon } from './get_span_icon';
import { spanTypeIcons } from './get_span_icon';

const spanTypes = Object.keys(spanTypeIcons);

export default {
  title: 'shared/icons',
  component: SpanIcon,
  decorators: [
    (Story: ComponentType) => (
      <EuiThemeProvider>
        <Story />
      </EuiThemeProvider>
    ),
  ],
};

export function SpanIcons() {
  return (
    <>
      <EuiCodeBlock language="html" isCopyable paddingSize="m">
        {'<SpanIcon type="db" subtype="cassandra" />'}
      </EuiCodeBlock>

      <EuiSpacer />

      <EuiFlexGroup gutterSize="l" wrap={true}>
        {spanTypes.map((type) => {
          const subTypes = Object.keys(spanTypeIcons[type]);
          return subTypes.map((subType) => {
            const id = `${type}.${subType}`;

            return (
              <EuiFlexItem key={id}>
                <EuiCard
                  icon={
                    <p>
                      <EuiToolTip
                        position="top"
                        content="Icon rendered with `EuiImage`"
                      >
                        <EuiImage
                          size="s"
                          hasShadow
                          alt={id}
                          src={getSpanIcon(type, subType)}
                        />
                      </EuiToolTip>
                    </p>
                  }
                  title={id}
                  description={
                    <>
                      <div>
                        <EuiToolTip
                          position="bottom"
                          content="Icon rendered with `SpanIcon`"
                        >
                          <SpanIcon type={type} subType={subType} />
                        </EuiToolTip>
                      </div>

                      <code
                        style={{
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div>span.type: {type}</div>
                        <div>span.subtype: {subType}</div>
                      </code>
                    </>
                  }
                />
              </EuiFlexItem>
            );
          });
        })}
      </EuiFlexGroup>
    </>
  );
}
