/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSideNav, EuiText, EuiToken } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import styled from 'styled-components';
import { Location, SymbolKind } from 'vscode-languageserver-types/lib/umd/main';
import { RepositoryUtils } from '../../../common/repository_utils';
import { EuiSideNavItem } from '../../common/types';
import { SymbolWithMembers } from '../../reducers/symbol';
import { history } from '../../utils/url';
import { FolderClosedTriangle, FolderOpenTriangle } from '../shared';

const Root = styled(EuiSideNav)`
  padding: ${theme.paddingSizes.l} ${theme.paddingSizes.m};
  overflow: auto;
`;

const Symbol = styled(EuiFlexGroup)`
  margin-bottom: ${theme.euiSizeS};
  cursor: pointer;
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
export class CodeSymbolTree extends React.PureComponent<Props> {
  public getClickHandler = (url: string) => () => {
    history.push(url);
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
    return (
      <Symbol gutterSize="none" alignItems="center">
        {isContainer &&
          (forceOpen ? (
            <FolderOpenTriangle onClick={() => this.props.closeSymbolPath(path)} />
          ) : (
            <FolderClosedTriangle onClick={() => this.props.openSymbolPath(path)} />
          ))}
        {/*
                // @ts-ignore */}
        <Token iconType={tokenType} />
        <EuiText
          data-test-subj={`codeStructureTreeNode-${name}`}
          onClick={this.getClickHandler(`${RepositoryUtils.locationToUrl(location)}?tab=structure`)}
        >
          <strong>{name}</strong>
        </EuiText>
      </Symbol>
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
        item.items = this.symbolsToSideNavItems(Array.from(s.members));
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
          false
        );
      }
      return item;
    });
  };

  public render() {
    const items = [
      { name: '', id: '', items: this.symbolsToSideNavItems(this.props.structureTree) },
    ];
    return <Root items={items} />;
  }
}
