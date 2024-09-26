/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiDescriptionList,
  EuiToolTip,
  EuiText,
  EuiFlexGrid,
  EuiIcon,
} from '@elastic/eui';
import styled from 'styled-components';
import { ConsoleCodeBlock } from './console_code_block';

export interface Script {
  id: string;
  name: string;
  description: string;
  platform: string[];
}

export interface ScriptsListProps {
  scripts: Script[];
  display?: 'default' | 'table';
}

const StyledEuiFlexGrid = styled(EuiFlexGrid)`
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.l}) {
    max-width: 75%;
  }
  @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.xl}) {
    max-width: 50%;
  }
`;

export const ScriptsList = memo<ScriptsListProps>(({ scripts, display = 'default' }) => {
  return (
    <div>
      <EuiSpacer size="s" />
      {scripts.map((script) => (
        <StyledEuiFlexGrid
          columns={3}
          responsive={false}
          gutterSize="l"
          key={script.id}
          direction="row"
        >
          <EuiFlexItem key={script.id}>
            <EuiDescriptionList
              compressed
              listItems={[
                {
                  title: (
                    <EuiToolTip content={script.name}>
                      <ConsoleCodeBlock inline bold>
                        {script.name}
                      </ConsoleCodeBlock>
                    </EuiToolTip>
                  ),
                  description: (
                    <>
                      {script.platform?.map((platform) => (
                        <EuiText color="subdued" size="xs" textAlign="right" key={platform}>
                          <EuiIcon
                            type={`logo${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                            title={platform}
                          />
                        </EuiText>
                      ))}
                    </>
                  ),
                },
              ]}
            />
          </EuiFlexItem>
        </StyledEuiFlexGrid>
      ))}
      <EuiSpacer size="xl" />
    </div>
  );
});
ScriptsList.displayName = 'ScriptsList';
