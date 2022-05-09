/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiToolTip,
} from '@elastic/eui';
import type { Story } from '@storybook/react';
import React from 'react';
import { getSpanIcon, spanTypeIcons } from './get_span_icon';
import { SpanIcon } from '.';

const spanTypes = Object.keys(spanTypeIcons);

export default {
  title: 'shared/SpanIcon',
  component: SpanIcon,
};

export const List: Story = () => {
  return (
    <EuiFlexGroup gutterSize="l" wrap={true}>
      {spanTypes.map((type) => {
        const subtypes = Object.keys(spanTypeIcons[type]);
        return subtypes.map((subtype) => {
          const id = `${type}.${subtype}`;

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
                        src={getSpanIcon(type, subtype)}
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
                        <SpanIcon type={type} subtype={subtype} />
                      </EuiToolTip>
                    </div>

                    <code
                      style={{
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div>span.type: {type}</div>
                      <div>span.subtype: {subtype}</div>
                    </code>
                  </>
                }
              />
            </EuiFlexItem>
          );
        });
      })}
    </EuiFlexGroup>
  );
};
