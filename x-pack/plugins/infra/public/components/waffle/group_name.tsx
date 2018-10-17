/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLink, EuiToolTip } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { InfraWaffleMapGroup } from '../../lib/lib';

interface Props {
  onDrilldown: () => void;
  group: InfraWaffleMapGroup;
  isChild?: boolean;
}

export class GroupName extends React.PureComponent<Props, {}> {
  public render() {
    const { group, isChild } = this.props;
    const linkStyle = {
      fontSize: isChild ? '0.85em' : '1em',
    };
    return (
      <GroupNameContainer>
        <Inner isChild={isChild}>
          <Name>
            <EuiToolTip position="top" content={group.name}>
              <EuiLink style={linkStyle} onClickCapture={this.handleClick}>
                {group.name}
              </EuiLink>
            </EuiToolTip>
          </Name>
          <Count>{group.count}</Count>
        </Inner>
      </GroupNameContainer>
    );
  }

  private handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    // TODO: fill this in with group click handler
    event.preventDefault();
    this.props.onDrilldown();
  };
}

const GroupNameContainer = styled.div`
  position: relative;
  text-align: center
  font-size: 16px;
  margin-bottom: 5px; 
  top: 20px;
  display: flex;
  justify-content: center;
  padding: 0 10px;
`;

interface InnerProps {
  isChild?: boolean;
}

const Inner = styled<InnerProps, 'div'>('div')`
  border: 1px solid ${props => props.theme.eui.euiBorderColor};
  background-color: ${props =>
    props.isChild ? props.theme.eui.euiColorLightestShade : props.theme.eui.euiColorEmptyShade};
  border-radius: 4px;
  box-shadow: 0px 2px 0px 0px ${props => props.theme.eui.euiBorderColor};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Name = styled.div`
  flex: 1 1 auto;
  padding: 6px 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Count = styled.div`
  flex: 0 0 auto;
  border-left: 1px solid ${props => props.theme.eui.euiBorderColor};
  padding: 6px 10px;
  font-size: 0.85em;
  font-weight: normal;
`;
