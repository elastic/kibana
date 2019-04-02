/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSideNav, EuiText, EuiToken } from '@elastic/eui';
import { IconType } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Location, SymbolKind } from 'vscode-languageserver-types/lib/umd/main';
import { RepositoryUtils } from '../../../common/repository_utils';
import { EuiSideNavItem } from '../../common/types';
import { SymbolWithMembers } from '../../reducers/symbol';

const Root = styled.div`
  padding: ${theme.paddingSizes.l} ${theme.paddingSizes.m};
  position: relative;
  display: inline-block;
  min-width: 100%;
  height: 100%;
`;

const Symbol = styled.div<{ isContainer: boolean }>`
  cursor: pointer;
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  align-items: center;
  height: 1.5rem;
  margin-left: ${props => (props.isContainer ? '0.75rem' : '2rem')};
`;

const Token = styled(EuiToken)`
  margin-right: ${theme.euiSizeS};
`;

interface Props {
  structureTree: SymbolWithMembers[];
  closedPaths: string[];
  openSymbolPath: (p: string) => void;
  closeSymbolPath: (p: string) => void;
}

const sortSymbol = (a: SymbolWithMembers, b: SymbolWithMembers) => {
  const lineDiff = a.location.range.start.line - b.location.range.start.line;
  if (lineDiff === 0) {
    return a.location.range.start.character - b.location.range.start.character;
  } else {
    return lineDiff;
  }
};

export class CodeSymbolTree extends React.PureComponent<Props, { activePath?: string }> {
  public state = { activePath: undefined };

  public getClickHandler = (path: string) => () => {
    this.setState({ activePath: path });
  };

  public getStructureTreeItemRenderer = (
    location: Location,
    name: string,
    kind: SymbolKind,
    isContainer: boolean = false,
    forceOpen: boolean = false,
    path: string = ''
  ) => () => {
    let tokenType = 'tokenFile';
    if (kind !== SymbolKind.Module) {
      // @ts-ignore
      tokenType = `token${Object.keys(SymbolKind).find(k => SymbolKind[k] === kind)}`;
    }
    let bg = null;
    if (this.state.activePath === path) {
      bg = <div className="code-full-width-node" />;
    }
    return (
      <EuiFlexGroup gutterSize="none" alignItems="center">
        <Symbol isContainer={isContainer}>
          {isContainer &&
            (forceOpen ? (
              <EuiIcon
                type="arrowDown"
                size="s"
                color="subdued"
                className="codeStructureTree--icon"
                onClick={() => this.props.closeSymbolPath(path)}
              />
            ) : (
              <EuiIcon
                type="arrowRight"
                size="s"
                color="subdued"
                className="codeStructureTree--icon"
                onClick={() => this.props.openSymbolPath(path)}
              />
            ))}
          <EuiFlexItem grow={1}>
            <Link
              to={`${RepositoryUtils.locationToUrl(location)}?tab=structure`}
              className="code-link"
              onClick={this.getClickHandler(path)}
            >
              <EuiFlexGroup gutterSize="none" alignItems="center" className="code-structure-node">
                <Token iconType={tokenType as IconType} />
                <EuiText data-test-subj={`codeStructureTreeNode-${name}`} size="s">
                  {name}
                </EuiText>
              </EuiFlexGroup>
            </Link>
          </EuiFlexItem>
        </Symbol>
        {bg}
      </EuiFlexGroup>
    );
  };

  public symbolsToSideNavItems = (symbolsWithMembers: SymbolWithMembers[]): EuiSideNavItem[] => {
    return symbolsWithMembers.sort(sortSymbol).map((s: SymbolWithMembers, index: number) => {
      const item: EuiSideNavItem = {
        name: s.name,
        id: `${s.name}_${index}`,
        onClick: () => void 0,
      };
      if (s.members) {
        item.items = this.symbolsToSideNavItems(s.members);
        item.forceOpen = !this.props.closedPaths.includes(s.path!);
        item.renderItem = this.getStructureTreeItemRenderer(
          s.location,
          s.name,
          s.kind,
          true,
          item.forceOpen,
          s.path
        );
      } else {
        item.renderItem = this.getStructureTreeItemRenderer(
          s.location,
          s.name,
          s.kind,
          false,
          false,
          s.path
        );
      }
      return item;
    });
  };

  public render() {
    const items = [
      { name: '', id: '', items: this.symbolsToSideNavItems(this.props.structureTree) },
    ];
    return (
      <Root>
        <EuiSideNav items={items} />
      </Root>
    );
  }
}
