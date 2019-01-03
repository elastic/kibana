/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSideNav, EuiText, EuiToken } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Location, SymbolKind } from 'vscode-languageserver-types/lib/esm/main';
import { RepositoryUtils } from '../../../common/repository_utils';
import { closeSymbolPath, openSymbolPath } from '../../actions';
import { EuiSideNavItem } from '../../common/types';
import { RootState } from '../../reducers';
import { SymbolWithMembers } from '../../reducers/symbol';
import { structureSelector } from '../../selectors';
import { FolderClosedTriangle, FolderOpenTriangle } from '../shared';

const Root = styled(EuiSideNav)`
  padding: 20px 16px;
  overflow: auto;
`;

const Symbol = styled(EuiFlexGroup)`
  margin-bottom: 8px;
`;

const Token = styled(EuiToken)`
  margin-right: 6px;
`;

interface Props {
  structureTree: SymbolWithMembers[];
  openPaths: string[];
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
class CodeSymbolTree extends React.PureComponent<Props> {
  public getStructureTreeItemRenderer = (
    location: Location,
    name: string,
    kind: SymbolKind,
    isContainer: boolean = false,
    forceOpen: boolean = false,
    path: string = ''
  ) => () => (
    <Symbol gutterSize="none" alignItems="center">
      {isContainer &&
        (forceOpen ? (
          <FolderOpenTriangle onClick={() => this.props.closeSymbolPath(path)} />
        ) : (
          <FolderClosedTriangle onClick={() => this.props.openSymbolPath(path)} />
        ))}
      {/*
                // @ts-ignore */}
      <Token iconType={`token${Object.keys(SymbolKind).find(k => SymbolKind[k] === kind)}`} />
      <Link to={RepositoryUtils.locationToUrl(location)}>
        <EuiText>
          <strong>{name}</strong>
        </EuiText>
      </Link>
    </Symbol>
  );

  public symbolsToSideNavItems = (symbolsWithMembers: SymbolWithMembers[]): EuiSideNavItem[] => {
    return symbolsWithMembers.sort(sortSymbol).map((s: SymbolWithMembers, index: number) => {
      const item: EuiSideNavItem = {
        name: s.name,
        id: `${s.name}_${index}`,
        onClick: () => void 0,
      };
      if (s.members) {
        item.items = this.symbolsToSideNavItems(Array.from(s.members));
        item.forceOpen = this.props.openPaths.includes(s.path!);
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

const mapStateToProps = (state: RootState) => ({
  structureTree: structureSelector(state),
  openPaths: state.symbol.openPaths,
});

const mapDispatchToProps = {
  openSymbolPath,
  closeSymbolPath,
};

export const SymbolTree = connect(
  mapStateToProps,
  mapDispatchToProps
)(CodeSymbolTree);
