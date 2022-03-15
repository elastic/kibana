/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { CommandDefinition } from '../types';

export interface CommandListProps {
  commands: CommandDefinition[];
}

export const CommandList = memo<CommandListProps>(({ commands }) => {
  return (
    <>
      <EuiFlexGroup wrap gutterSize="xs">
        {commands.map(({ name, about }) => {
          return (
            <EuiFlexItem grow={2} style={{ flexBasis: '20%' }}>
              <EuiDescriptionList compressed listItems={[{ title: name, description: about }]} />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
      <EuiText>
        {`For more details on the commands above use the `}
        <code>{`--help`}</code>
        {` argument. Example: `}
        <code>{'some-command --help'}</code>
      </EuiText>
    </>
  );
});
CommandList.displayName = 'CommandList';
