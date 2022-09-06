/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiBadge,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CommandDefinition } from '../types';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export interface CommandListProps {
  commands: CommandDefinition[];
}

export const CommandList = memo<CommandListProps>(({ commands }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  const footerMessage = useMemo(() => {
    return (
      <FormattedMessage
        id="xpack.securitySolution.console.commandList.footerText"
        defaultMessage="For more details on the commands above use the {helpOption} argument. Example: {cmdExample}"
        values={{
          helpOption: <EuiCode>{'--help'}</EuiCode>,
          cmdExample: <EuiCode>{'some-command --help'}</EuiCode>,
        }}
      />
    );
  }, []);

  return (
    <>
      <EuiFlexGroup gutterSize="l" direction="column" data-test-subj={getTestId('commandList')}>
        {commands.map(({ name, about }) => {
          return (
            <EuiFlexItem grow={2} key={name}>
              <EuiDescriptionList
                compressed
                listItems={[{ title: <EuiBadge>{name}</EuiBadge>, description: about }]}
                data-test-subj={getTestId('commandList-command')}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiText size="s">
        <EuiTextColor color="subdued">{footerMessage}</EuiTextColor>
      </EuiText>
    </>
  );
});
CommandList.displayName = 'CommandList';
