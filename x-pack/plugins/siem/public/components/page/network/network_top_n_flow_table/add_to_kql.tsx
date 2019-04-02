/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { NetworkFilter } from '../../../../containers/network';
import { WithSource } from '../../../../containers/source';
import { IndexType } from '../../../../graphql/types';
import { KueryFilterQuery, networkModel } from '../../../../store';
import { WithHoverActions } from '../../../with_hover_actions';

interface AddToKqlProps {
  children: JSX.Element;
  content: string;
  expression: string;
  type: networkModel.NetworkType;
}

interface Props extends AddToKqlProps {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
}

class AddToKqlComponent extends React.PureComponent<Props> {
  public render() {
    const { children, content } = this.props;
    return (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content={content}>
              <EuiIcon type="filter" onClick={this.addToKql} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
        render={() => children}
      />
    );
  }

  private addToKql = () => {
    const { expression, filterQueryDraft, applyFilterQueryFromKueryExpression } = this.props;
    applyFilterQueryFromKueryExpression(
      filterQueryDraft && !isEmpty(filterQueryDraft.expression)
        ? `${filterQueryDraft.expression} and ${expression}`
        : expression
    );
  };
}

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 30px;
  cursor: pointer;
`;

export const AddToKql = pure<AddToKqlProps>(({ children, content, expression, type }) => (
  <WithSource sourceId="default" indexTypes={[IndexType.FILEBEAT, IndexType.PACKETBEAT]}>
    {({ indexPattern }) => (
      <NetworkFilter indexPattern={indexPattern} type={type}>
        {({ applyFilterQueryFromKueryExpression, filterQueryDraft }) => (
          <AddToKqlComponent
            applyFilterQueryFromKueryExpression={applyFilterQueryFromKueryExpression}
            content={content}
            expression={expression}
            filterQueryDraft={filterQueryDraft}
            type={type}
          >
            {children}
          </AddToKqlComponent>
        )}
      </NetworkFilter>
    )}
  </WithSource>
));
