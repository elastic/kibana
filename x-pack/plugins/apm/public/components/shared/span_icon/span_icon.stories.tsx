/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiCopy,
  EuiPanel,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';
import React from 'react';
import { storiesOf } from '@storybook/react';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { SpanIcon } from './index';
import { typeIcons } from './get_span_icon';

const types = Object.keys(typeIcons);

storiesOf('shared/span_icon/span_icon', module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Span icon',
    () => {
      return (
        <>
          <EuiCodeBlock language="html" isCopyable paddingSize="m">
            {'<SpanIcon type="db" subtype="cassandra" />'}
          </EuiCodeBlock>

          <EuiSpacer />
          <EuiFlexGrid direction="column" columns={3}>
            {types.map((type) => {
              const subTypes = Object.keys(typeIcons[type]);
              return (
                <>
                  {subTypes.map((subType) => {
                    const id = `${type}.${subType}`;
                    return (
                      <EuiFlexItem key={id}>
                        <EuiCopy
                          display="block"
                          textToCopy={id}
                          afterMessage={`${id} copied`}
                        >
                          {(copy) => (
                            <EuiPanel
                              hasShadow={false}
                              hasBorder={false}
                              onClick={copy}
                              paddingSize="s"
                            >
                              <SpanIcon type={type} subType={subType} /> &emsp;{' '}
                              <small>{id}</small>
                            </EuiPanel>
                          )}
                        </EuiCopy>
                      </EuiFlexItem>
                    );
                  })}
                </>
              );
            })}
          </EuiFlexGrid>
        </>
      );
    },
    {}
  );
