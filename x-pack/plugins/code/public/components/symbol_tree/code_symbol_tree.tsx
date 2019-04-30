/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiIcon, EuiSideNav, EuiText, EuiToken } from '@elastic/eui';
import { IconType } from '@elastic/eui';
import React from 'react';
import { Link } from 'react-router-dom';
import url from 'url';
import { Location, SymbolKind } from 'vscode-languageserver-types/lib/umd/main';
import { isEqual } from 'lodash';

import { RepositoryUtils } from '../../../common/repository_utils';
import { EuiSideNavItem } from '../../common/types';
import { SymbolWithMembers } from '../../reducers/symbol';

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

interface ActiveSymbol {
  name: string;
  location: Location;
}

export class CodeSymbolTree extends React.PureComponent<Props, { activeSymbol?: ActiveSymbol }> {
  public state: { activeSymbol?: ActiveSymbol } = {};

  public getClickHandler = (symbol: ActiveSymbol) => () => {
    this.setState({ activeSymbol: symbol });
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

    // @ts-ignore
    tokenType = `token${Object.keys(SymbolKind).find(k => SymbolKind[k] === kind)}`;
    let bg = null;
    if (
      this.state.activeSymbol &&
      this.state.activeSymbol.name === name &&
      isEqual(this.state.activeSymbol.location, location)
    ) {
      bg = <div className="code-full-width-node" />;
    }
    return (
      <div className="code-symbol-container">
        {bg}
        <div className={isContainer ? 'codeSymbol' : 'codeSymbol codeSymbol--nested'}>
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
          <Link
            to={url.format({
              pathname: RepositoryUtils.locationToUrl(location),
              query: { tab: 'structure' },
            })}
            className="code-symbol-link"
            onClick={this.getClickHandler({ name, location })}
          >
            <EuiFlexGroup gutterSize="none" alignItems="center" className="code-structure-node">
              <EuiToken iconType={tokenType as IconType} />
              <EuiText data-test-subj={`codeStructureTreeNode-${name}`} size="s">
                {name}
              </EuiText>
            </EuiFlexGroup>
          </Link>
        </div>
      </div>
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
        item.forceOpen = !this.props.closedPaths.includes(s.path!);
        if (item.forceOpen) {
          item.items = this.symbolsToSideNavItems(s.members);
        }
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
      <div className="codeContainer__symbolTree">
        <EuiSideNav items={items} />
      </div>
    );
  }
}
