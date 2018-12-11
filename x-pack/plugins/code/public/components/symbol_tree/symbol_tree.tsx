/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSideNav } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { Location } from 'vscode-languageserver-types/lib/esm/main';
import { RepositoryUtils } from '../../../common/repository_utils';
import { EuiSideNavItem } from '../../common/types';
import { RootState } from '../../reducers';
import { SymbolWithMembers } from '../../reducers/symbol';
import { structureSelector } from '../../selectors';
import { mockFunction } from '../../utils/test_utils';

interface Props {
  structureTree: SymbolWithMembers[];
}

const sortSymbol = (a: SymbolWithMembers, b: SymbolWithMembers) => {
  const lineDiff = a.location.range.start.line - b.location.range.start.line;
  if (lineDiff === 0) {
    return a.location.range.start.character - b.location.range.start.character;
  } else {
    return lineDiff;
  }
};
class CodeSymbolTree extends React.PureComponent<Props> {
  public getStructureTreeItemRenderer = (location: Location, name: string) => () => (
    <div className="symbolLinkContainer">
      <Link to={RepositoryUtils.locationToUrl(location)}>{name}</Link>
    </div>
  );

  public symbolsToSideNavItems = (symbolsWithMembers: SymbolWithMembers[]): EuiSideNavItem[] => {
    return symbolsWithMembers.sort(sortSymbol).map((s: SymbolWithMembers, index: number) => {
      const item: EuiSideNavItem = {
        name: s.name,
        id: `${s.name}_${index}`,
        renderItem: this.getStructureTreeItemRenderer(s.location, s.name),
        onClick: mockFunction,
      };
      if (s.members) {
        item.items = this.symbolsToSideNavItems(Array.from(s.members));
        item.forceOpen = true;
      }
      return item;
    });
  };

  public render() {
    const items = [
      { name: '', id: '', items: this.symbolsToSideNavItems(this.props.structureTree) },
    ];
    return <EuiSideNav items={items} style={{ overflow: 'auto' }} className="sideNavTree" />;
  }
}

const mapStateToProps = (state: RootState) => {
  return { structureTree: structureSelector(state) };
};

export const SymbolTree = connect(mapStateToProps)(CodeSymbolTree);
