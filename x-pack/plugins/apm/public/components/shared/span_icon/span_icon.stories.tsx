/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import React from 'react';
import { getSpanIcon, spanTypeIcons } from './get_span_icon';
import { SpanIcon } from './index';

const spanTypes = Object.keys(spanTypeIcons);

export default {
  title: 'shared/icons',
  component: SpanIcon,
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
